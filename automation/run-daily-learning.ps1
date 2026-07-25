<#
.SYNOPSIS
    Generates, validates and publishes one Daily Learnings lesson.

.DESCRIPTION
    This is the primary runner on this machine, because there is no usable WSL
    distribution installed. If a real WSL distro is present it delegates to
    automation/run-daily-learning.sh instead; otherwise it runs Claude Code
    natively on Windows.

    The division of responsibility matters: Claude is granted a narrow set of
    permissions and writes exactly one lesson file. This script owns everything
    that could do damage - the source-repository integrity check, validation,
    the privacy scan, the commit and the push. Nothing is published unless every
    gate passes.

.PARAMETER DryRun
    Generate and validate, but never stage, commit or push.

.PARAMETER SkipPush
    Commit locally but do not push.

.PARAMETER ForceNative
    Ignore WSL even if a usable distribution exists.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File automation\run-daily-learning.ps1 -DryRun

.NOTES
    Exit codes
      0  success
      2  another run holds the lock
      3  a prerequisite is missing
      4  a source repository was modified - publishing aborted
      5  validation failed (content, lint, types or build)
      6  the privacy scan found something
      7  commit or push failed
      8  Claude produced no new lesson
      1  anything else
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$SkipPush,
    [switch]$ForceNative,
    [string]$WorkRepoRoot = "C:\Users\Admin\Documents\Work Repo",
    [string]$GitHubAccount = "Rejhinald"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $PSScriptRoot 'logs'
$StateDir = Join-Path $PSScriptRoot '.state'
$LockFile = Join-Path $StateDir 'run.lock'
$StateFile = Join-Path $StateDir 'state.json'
$PromptFile = Join-Path $PSScriptRoot 'daily-learning-prompt.md'
$ContentDir = Join-Path $RepoDir 'src\content\learnings'
$ExpectedRemote = 'https://github.com/Rejhinald/daily-learnings.git'

foreach ($dir in @($LogDir, $StateDir)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
}

$Stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$LogFile = Join-Path $LogDir "daily-$Stamp.log"
$script:LockAcquired = $false

function Write-Log {
    param([string]$Message, [ValidateSet('INFO', 'WARN', 'FAIL', 'OK')][string]$Level = 'INFO')
    $line = "[{0}] {1,-4} {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

function Stop-Run {
    param([int]$Code, [string]$Message, [string]$Level = 'FAIL')
    Write-Log $Message $Level
    Write-Log "Log written to $LogFile"
    if ($script:LockAcquired -and (Test-Path $LockFile)) { Remove-Item $LockFile -Force -ErrorAction SilentlyContinue }
    exit $Code
}

<#
 Runs a native command, streams BOTH streams to the log, and returns its exit
 code.

 stderr is merged deliberately: it is where every useful diagnostic lives, and
 without it a failed validation gate logs "lint failed" and nothing else. The
 preference is relaxed first because merging turns native stderr into
 ErrorRecords, which under 'Stop' would terminate on any tool that writes
 progress to stderr - git fetch does exactly that on a healthy run.
#>
function Invoke-Native {
    param([string]$File, [string[]]$Arguments, [string]$WorkingDirectory = $RepoDir)
    Write-Log "run: $File $($Arguments -join ' ')"
    $previous = Get-Location
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    Set-Location $WorkingDirectory
    try {
        & $File @Arguments 2>&1 | ForEach-Object {
            $text = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { "$_" }
            Write-Host $text
            Add-Content -Path $LogFile -Value $text -Encoding utf8
        }
        return $LASTEXITCODE
    } finally {
        Set-Location $previous
        $ErrorActionPreference = $previousPreference
    }
}

<#
 Returns a git command's stdout, or "" if it failed.

 The redirection matters: under $ErrorActionPreference = 'Stop', PowerShell 5.1
 turns a native command's redirected stderr into a terminating error. Git writes
 to stderr routinely (a repository with no commits, a missing ref), so without
 relaxing the preference here a perfectly normal git message would abort the run.
#>
function Get-GitOutput {
    param([string]$Directory, [string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & git -C $Directory @Arguments 2>$null
        if ($LASTEXITCODE -ne 0 -or $null -eq $output) { return "" }
        return ($output -join "`n")
    } catch {
        return ""
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

<#
 Fingerprints every source repository so we can prove afterwards that the run
 did not touch them. Branch plus porcelain status is enough: any edit, stage,
 checkout or stash changes one of the two.
#>
function Get-SourceRepoSnapshot {
    param([string]$Root)
    $snapshot = @{}
    $candidates = New-Object System.Collections.Generic.List[string]

    Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Name -eq 'daily-learnings') { return }
        $candidates.Add($_.FullName)
        # One level down catches grouped repositories such as a portal inside a folder.
        Get-ChildItem -Path $_.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Name -notin @('node_modules', '.git', '.next', 'dist', 'build', '.turbo', 'coverage')) {
                $candidates.Add($_.FullName)
            }
        }
    }

    foreach ($dir in $candidates) {
        if (-not (Test-Path (Join-Path $dir '.git'))) { continue }
        $branch = Get-GitOutput -Directory $dir -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')
        $head = Get-GitOutput -Directory $dir -Arguments @('rev-parse', 'HEAD')
        $porcelain = Get-GitOutput -Directory $dir -Arguments @('status', '--porcelain', '--untracked-files=all')
        $snapshot[$dir] = [PSCustomObject]@{
            Branch    = $branch.Trim()
            Head      = $head.Trim()
            Porcelain = $porcelain
        }
    }
    return $snapshot
}

function Compare-SourceRepoSnapshot {
    param([hashtable]$Before, [hashtable]$After)
    $changed = New-Object System.Collections.Generic.List[string]

    foreach ($key in $Before.Keys) {
        if (-not $After.ContainsKey($key)) {
            $changed.Add("$key (disappeared during the run)")
            continue
        }
        $b = $Before[$key]; $a = $After[$key]
        if ($b.Branch -ne $a.Branch) { $changed.Add("$key (branch $($b.Branch) -> $($a.Branch))") }
        elseif ($b.Head -ne $a.Head) { $changed.Add("$key (HEAD moved)") }
        elseif ($b.Porcelain -ne $a.Porcelain) { $changed.Add("$key (working tree changed)") }
    }

    # Symmetric: a repository that appeared during the run is just as much a
    # sign that something wrote where it should not have.
    foreach ($key in $After.Keys) {
        if (-not $Before.ContainsKey($key)) { $changed.Add("$key (appeared during the run)") }
    }

    return $changed
}

# ---------------------------------------------------------------- start

Write-Log "Daily Learnings run starting. Repo: $RepoDir"

# 1. Lock, so two runs can never overlap.
if (Test-Path $LockFile) {
    # An empty or race-deleted lock file makes Get-Content return $null, and
    # .Trim() on $null throws outside the try/catch below - which would wedge
    # the automation permanently on a file it could otherwise have taken over.
    $rawLock = Get-Content $LockFile -Raw -ErrorAction SilentlyContinue
    $holder = if ($null -eq $rawLock) { '' } else { $rawLock.Trim() }
    $alive = $false
    if ($holder -match '^\d+$') {
        $alive = $null -ne (Get-Process -Id ([int]$holder) -ErrorAction SilentlyContinue)
    }
    if ($alive) { Stop-Run 2 "Another run is already in progress (PID $holder). Exiting." }
    Write-Log ("Found a stale lock (holder '{0}'); taking it over." -f $holder) 'WARN'
}
Set-Content -Path $LockFile -Value $PID -Encoding ascii
$script:LockAcquired = $true

try {
    # 2. Delegate to WSL when a real distribution is available.
    if (-not $ForceNative) {
        $distros = @()
        try {
            $raw = & wsl.exe --list --quiet 2>$null
            # The @() wrapper is load-bearing: an unwrapped pipeline yields
            # $null for no matches and a bare [String] for one, and under
            # Set-StrictMode neither has a .Count - which threw below and
            # aborted the whole run before it reached the native fallback.
            if ($raw) { $distros = @($raw | ForEach-Object { ($_ -replace "`0", '').Trim() } | Where-Object { $_ -and $_ -notmatch 'docker-desktop' }) }
        } catch { $distros = @() }

        if ($distros.Count -gt 0) {
            Write-Log "WSL distribution '$($distros[0])' found - delegating to the shell runner."
            $wslRepo = '/mnt/' + $RepoDir.Substring(0, 1).ToLower() + ($RepoDir.Substring(2) -replace '\\', '/')
            # --no-lock: this process already holds it. Windows and WSL PIDs are
            # different namespaces, so the shell runner would read ours as stale,
            # take it over, and delete it out from under us on exit.
            $shArgs = @('-d', $distros[0], '--', 'bash', "$wslRepo/automation/run-daily-learning.sh", '--no-lock')
            if ($DryRun) { $shArgs += '--dry-run' }
            if ($SkipPush) { $shArgs += '--skip-push' }
            $code = Invoke-Native -File 'wsl.exe' -Arguments $shArgs
            Write-Log "Shell runner exited with $code"
            if ($script:LockAcquired) { Remove-Item $LockFile -Force -ErrorAction SilentlyContinue }
            exit $code
        }
        Write-Log "No usable WSL distribution - running natively on Windows."
    }

    # 3. Prerequisites.
    foreach ($tool in @('git', 'bun', 'claude')) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            Stop-Run 3 "Required tool '$tool' is not on PATH."
        }
    }
    # The denylist is a prerequisite, not an optional extra: without it the
    # client-name rule is silently disabled while the gates still pass.
    $DenylistFile = Join-Path $PSScriptRoot '.private-denylist.txt'
    foreach ($path in @($RepoDir, $PromptFile, $ContentDir, $WorkRepoRoot, $DenylistFile)) {
        if (-not (Test-Path $path)) { Stop-Run 3 "Required path is missing: $path" }
    }
    Write-Log "Prerequisites present." 'OK'

    # 4. Confirm we are pointed at the right repository, on the right branch.
    $remote = Get-GitOutput -Directory $RepoDir -Arguments @('remote', 'get-url', 'origin')
    if ($remote.Trim() -ne $ExpectedRemote) {
        Stop-Run 3 "origin is '$($remote.Trim())', expected '$ExpectedRemote'."
    }
    # Without this, a run started on a feature branch would push nothing while
    # still reporting success.
    $branch = (Get-GitOutput -Directory $RepoDir -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')).Trim()
    if ($branch -ne 'main') {
        Stop-Run 3 "Repository is on branch '$branch', expected 'main'. Nothing was generated or pushed."
    }

    # 5. Refresh main without ever discarding uncommitted human work.
    $dirtyBefore = Get-GitOutput -Directory $RepoDir -Arguments @('status', '--porcelain')
    if ($dirtyBefore) {
        Write-Log "Working tree has uncommitted changes; they will be left alone and not committed." 'WARN'
    }
    if ((Invoke-Native -File 'git' -Arguments @('fetch', 'origin', 'main')) -ne 0) {
        Write-Log "git fetch failed - continuing with the local checkout." 'WARN'
    } else {
        $behind = (Get-GitOutput -Directory $RepoDir -Arguments @('rev-list', '--count', 'HEAD..origin/main')).Trim()
        if ($behind -and $behind -ne '0') {
            if (-not $dirtyBefore) {
                # Fast-forward only. A merge or rebase here could rewrite human work.
                if ((Invoke-Native -File 'git' -Arguments @('merge', '--ff-only', 'origin/main')) -ne 0) {
                    Stop-Run 7 "Cannot fast-forward onto origin/main. Resolve this by hand."
                }
                Write-Log "Fast-forwarded $behind commit(s) from origin/main." 'OK'
            } else {
                Stop-Run 7 "Local is $behind commit(s) behind origin/main and the tree is dirty. Resolve by hand."
            }
        }
    }

    # 6. Integrity baseline for every source repository.
    Write-Log "Snapshotting source repositories under $WorkRepoRoot ..."
    $before = Get-SourceRepoSnapshot -Root $WorkRepoRoot
    Write-Log "Baseline recorded for $($before.Count) source repositor(ies)." 'OK'

    $lessonsBefore = @(Get-ChildItem -Path $ContentDir -Filter '*.mdx' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

    # Baseline for this repository too. The validation gates that run later are
    # scripts inside this tree, so a run that rewrote them would be marking its
    # own homework. --untracked-files=all keeps a new directory from collapsing
    # into a single '?? dir/' entry that hides what is inside it.
    $selfBefore = Get-GitOutput -Directory $RepoDir -Arguments @('status', '--porcelain', '--untracked-files=all')

    # 7. Generate the lesson.
    #    Permissions are deliberately narrow: read and search anywhere that was
    #    explicitly added, write ONLY into the lesson directory, and git only in
    #    its read-only forms. A bare 'Write' grant combined with --add-dir would
    #    also let Claude write into the private client repositories.
    #    --dangerously-skip-permissions is never used.
    $allowed = @(
        'Read', 'Glob', 'Grep', 'TodoWrite',
        'Write(src/content/learnings/**)', 'Edit(src/content/learnings/**)',
        'Bash(git status:*)', 'Bash(git log:*)', 'Bash(git show:*)', 'Bash(git diff:*)',
        'Bash(git branch:*)', 'Bash(git rev-parse:*)', 'Bash(git ls-files:*)',
        'Bash(bun run validate:content)'
    )
    $disallowed = @(
        'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git push:*)', 'Bash(git reset:*)',
        'Bash(git clean:*)', 'Bash(git checkout:*)', 'Bash(git switch:*)', 'Bash(git restore:*)',
        'Bash(git stash:*)', 'Bash(git rebase:*)', 'Bash(git merge:*)', 'Bash(git pull:*)',
        'Bash(git remote:*)', 'Bash(git branch -d:*)', 'Bash(git branch -D:*)',
        'Bash(rm:*)', 'Bash(del:*)', 'Bash(Remove-Item:*)',
        'Read(**/.env)', 'Read(**/.env.*)', 'WebFetch', 'WebSearch'
    )

    $today = Get-Date -Format 'yyyy-MM-dd'
    $prompt = @"
Today is $today. Generate today's Daily Learnings lesson.

The Work Repo root containing the source repositories to inspect is available as an additional
readable directory. Your working directory is the daily-learnings repository - write only here.

$(Get-Content $PromptFile -Raw)
"@

    Write-Log "Invoking Claude Code in non-interactive print mode ..."
    $claudeArgs = @(
        '--print',
        '--add-dir', $WorkRepoRoot,
        '--permission-mode', 'default',
        '--allowedTools'
    ) + $allowed + @('--disallowedTools') + $disallowed

    # Data piped to a native command is encoded with $OutputEncoding, which
    # defaults to ASCII on PowerShell 5.1 and would mangle every non-ASCII
    # character in the prompt before Claude ever sees it.
    $previousOutputEncoding = $OutputEncoding
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)

    Push-Location $RepoDir
    try {
        $prompt | & claude @claudeArgs | ForEach-Object {
            Write-Host $_
            Add-Content -Path $LogFile -Value $_ -Encoding utf8
        }
        $claudeExit = $LASTEXITCODE
    } finally {
        Pop-Location
        $OutputEncoding = $previousOutputEncoding
    }
    Write-Log "Claude exited with $claudeExit"

    # 8. Verify the source repositories are untouched. This gate runs even if
    #    Claude failed, because a partial run can still have written something.
    Write-Log "Re-checking source repositories ..."
    $after = Get-SourceRepoSnapshot -Root $WorkRepoRoot
    $changed = Compare-SourceRepoSnapshot -Before $before -After $after
    if ($changed.Count -gt 0) {
        foreach ($entry in $changed) { Write-Log "MODIFIED: $entry" 'FAIL' }
        Stop-Run 4 "A source repository changed during the run. Publishing aborted; nothing was committed."
    }
    Write-Log "All $($after.Count) source repositor(ies) unchanged (tracked and untracked files)." 'OK'

    # 8b. Verify this repository too, BEFORE running any of its scripts. The
    #     only acceptable difference is one or more new untracked lesson files.
    $selfAfter = Get-GitOutput -Directory $RepoDir -Arguments @('status', '--porcelain', '--untracked-files=all')
    if ($selfAfter -ne $selfBefore) {
        $baseline = @($selfBefore -split "`n" | Where-Object { $_ })
        $unexpected = @($selfAfter -split "`n" | Where-Object {
                $_ -and ($baseline -notcontains $_) -and ($_ -notmatch '^\?\? "?src/content/learnings/.+\.mdx"?$')
            })
        if ($unexpected.Count -gt 0) {
            foreach ($entry in $unexpected) { Write-Log "UNEXPECTED CHANGE: $entry" 'FAIL' }
            Stop-Run 4 "Claude changed files outside src/content/learnings. Publishing aborted; the validation gates were not run against a modified tree."
        }
    }
    Write-Log "This repository changed only inside src/content/learnings." 'OK'

    if ($claudeExit -ne 0) { Stop-Run 1 "Claude Code failed with exit code $claudeExit." }

    # 9. Did we actually get a new lesson?
    $lessonsAfter = @(Get-ChildItem -Path $ContentDir -Filter '*.mdx' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
    $newLessons = @($lessonsAfter | Where-Object { $lessonsBefore -notcontains $_ })
    if ($newLessons.Count -eq 0) { Stop-Run 8 "No new lesson file was created. Nothing to publish." }
    if ($newLessons.Count -gt 1) { Stop-Run 8 "Expected exactly one new lesson, found $($newLessons.Count): $($newLessons -join ', ')" }
    $lessonFile = $newLessons[0]
    Write-Log "New lesson: $lessonFile" 'OK'

    # 10. Full validation. Any failure stops the publish.
    foreach ($step in @(
            @{ Name = 'content validation'; Args = @('run', 'validate:content') },
            @{ Name = 'lint'; Args = @('run', 'lint') },
            @{ Name = 'typecheck'; Args = @('run', 'typecheck') },
            @{ Name = 'production build'; Args = @('run', 'build') }
        )) {
        Write-Log "Running $($step.Name) ..."
        if ((Invoke-Native -File 'bun' -Arguments $step.Args) -ne 0) {
            Stop-Run 5 "$($step.Name) failed. Nothing was committed."
        }
        Write-Log "$($step.Name) passed." 'OK'
    }

    if ($DryRun) {
        Write-Log "Dry run: stopping before staging. The lesson is on disk at src/content/learnings/$lessonFile." 'OK'
        Stop-Run 0 "Dry run complete." 'OK'
    }

    # 11. Stage only the lesson, so unrelated human edits are never swept in.
    if ((Invoke-Native -File 'git' -Arguments @('add', '--', "src/content/learnings/$lessonFile")) -ne 0) {
        Stop-Run 7 "Could not stage the lesson."
    }

    $staged = Get-GitOutput -Directory $RepoDir -Arguments @('diff', '--cached', '--name-only')
    if (-not $staged) { Stop-Run 8 "Nothing staged - refusing to create an empty commit." }
    Write-Log "Staged: $($staged -replace "`n", ', ')"

    # 12. Privacy scan on the exact bytes about to become public.
    Write-Log "Running the privacy scan on the staged diff ..."
    if ((Invoke-Native -File 'bun' -Arguments @('run', 'safety:scan')) -ne 0) {
        Invoke-Native -File 'git' -Arguments @('reset', '--', "src/content/learnings/$lessonFile") | Out-Null
        Stop-Run 6 "Privacy scan failed. The lesson was unstaged and nothing was committed."
    }
    Write-Log "Privacy scan passed." 'OK'

    # 13. Commit.
    # --only with an explicit pathspec: commit exactly the lesson, so anything
    # the human had already staged stays staged and unpublished. Without it the
    # WARN above ("they will be left alone") would be a false guarantee.
    $message = "content: add daily learning for $today"
    if ((Invoke-Native -File 'git' -Arguments @('commit', '--only', '-m', $message, '--', "src/content/learnings/$lessonFile")) -ne 0) {
        Stop-Run 7 "Commit failed."
    }
    $commit = (Get-GitOutput -Directory $RepoDir -Arguments @('rev-parse', '--short', 'HEAD')).Trim()
    Write-Log "Committed $commit - $message" 'OK'

    if ($SkipPush) { Stop-Run 0 "SkipPush set. Commit $commit is local; push it by hand when ready." 'OK' }

    # 14. Push. Never forced. If the remote moved, re-validate before retrying.
    # This machine has two authenticated GitHub accounts and the other one is
    # active by default, so the push would use the wrong credential.
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Invoke-Native -File 'gh' -Arguments @('auth', 'switch', '--hostname', 'github.com', '--user', $GitHubAccount) | Out-Null
        Write-Log "Switched gh to the $GitHubAccount account."
    }

    if ((Invoke-Native -File 'git' -Arguments @('push', 'origin', 'main')) -ne 0) {
        Write-Log "Push rejected - the remote likely moved. Fetching and retrying once." 'WARN'
        if ((Invoke-Native -File 'git' -Arguments @('fetch', 'origin', 'main')) -ne 0) { Stop-Run 7 "Fetch failed." }
        if ((Invoke-Native -File 'git' -Arguments @('rebase', 'origin/main')) -ne 0) {
            Invoke-Native -File 'git' -Arguments @('rebase', '--abort') | Out-Null
            Stop-Run 7 "Could not rebase onto origin/main safely. Commit $commit is local; resolve by hand. Nothing was overwritten."
        }
        Write-Log "Rebased. Re-running validation before pushing ..."
        if ((Invoke-Native -File 'bun' -Arguments @('run', 'validate:content')) -ne 0) { Stop-Run 5 "Validation failed after the rebase." }
        if ((Invoke-Native -File 'bun' -Arguments @('run', 'build')) -ne 0) { Stop-Run 5 "Build failed after the rebase." }
        if ((Invoke-Native -File 'git' -Arguments @('push', 'origin', 'main')) -ne 0) {
            Stop-Run 7 "Push still failed. Commit $commit is local and safe."
        }
    }

    # A push that printed "Everything up-to-date" exits 0 without publishing
    # anything, so confirm the remote ref actually moved to our commit.
    $localHead = (Get-GitOutput -Directory $RepoDir -Arguments @('rev-parse', 'HEAD')).Trim()
    $remoteHead = (Get-GitOutput -Directory $RepoDir -Arguments @('rev-parse', 'origin/main')).Trim()
    if ($localHead -ne $remoteHead) {
        Stop-Run 7 "Push reported success but origin/main is at '$remoteHead', not '$localHead'. Nothing was published."
    }

    # 15. Record state for the next run. Gitignored: it holds machine paths.
    @{
        lastRunAt          = (Get-Date).ToString('o')
        lastPublishedSlug  = ($lessonFile -replace '^\d{4}-\d{2}-\d{2}-', '' -replace '\.mdx$', '')
        lastCommit         = $commit
        lastRepoHeads      = ($after.Keys | ForEach-Object { @{ repo = $_; head = $after[$_].Head } })
    } | ConvertTo-Json -Depth 5 | Set-Content -Path $StateFile -Encoding utf8

    Write-Log "Pushed $commit to origin/main. Vercel will deploy it." 'OK'
    Stop-Run 0 "Done." 'OK'

} catch {
    Write-Log "Unhandled error: $($_.Exception.Message)" 'FAIL'
    Write-Log $_.ScriptStackTrace 'FAIL'
    Stop-Run 1 "Run aborted."
}
