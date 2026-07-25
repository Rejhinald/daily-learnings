<#
.SYNOPSIS
    Installs (or removes) the "Daily Learnings Generator" scheduled task.

.DESCRIPTION
    Idempotent: running it again updates the existing task rather than creating
    a duplicate. The task runs as the current user with no stored password,
    which means it only fires while that user is logged on - see NOTES.

.PARAMETER RunTime
    Local 24-hour time, HH:mm. Defaults to 21:00. The machine's clock is
    UTC+08:00, the same offset as Asia/Manila, so local time is Manila time.

.PARAMETER Uninstall
    Remove the task and exit.

.PARAMETER Test
    Register nothing; run the generator once as a dry run and exit.

.EXAMPLE
    # Install at the default 21:00
    powershell -NoProfile -ExecutionPolicy Bypass -File automation\install-scheduled-task.ps1

.EXAMPLE
    # Install at a different time
    powershell -NoProfile -ExecutionPolicy Bypass -File automation\install-scheduled-task.ps1 -RunTime 08:30

.EXAMPLE
    # Remove it
    powershell -NoProfile -ExecutionPolicy Bypass -File automation\install-scheduled-task.ps1 -Uninstall

.NOTES
    The computer must be POWERED ON and the user LOGGED ON at the scheduled
    time. This is a deliberate trade-off: running whether or not the user is
    logged on requires storing the account password, which this installer will
    not do. If a run is missed (machine asleep or off), StartWhenAvailable makes
    the task fire as soon as the machine is usable again.

    The task is skipped when there is no network connection, since it needs to
    push to GitHub.
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$RunTime = "21:00",
    [switch]$Uninstall,
    [switch]$Test
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TaskName = 'Daily Learnings Generator'
$Wrapper = Join-Path $PSScriptRoot 'run-daily-learning.ps1'

function Write-Step { param([string]$Message) Write-Host "  $Message" }

# Write-Error throws under $ErrorActionPreference = 'Stop', so the exit that
# follows it never runs and the script dies with code 1 and a stack trace.
# Write-Host + exit keeps the message readable and the exit code deliberate.
function Fail {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Wrapper)) {
    Fail "Cannot find the runner at $Wrapper"
}

# ---- uninstall -------------------------------------------------------------
if ($Uninstall) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        Write-Host "Task '$TaskName' is not installed. Nothing to do."
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed the scheduled task '$TaskName'."
    exit 0
}

# ---- manual test -----------------------------------------------------------
if ($Test) {
    Write-Host "Running the generator once as a dry run (nothing will be committed or pushed)."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Wrapper -DryRun
    exit $LASTEXITCODE
}

# ---- validate the run time -------------------------------------------------
# The specification ships this as a {{DAILY_RUN_TIME}} placeholder. Registering
# a task against an unreplaced placeholder would create a job that never fires
# at a meaningful time, so refuse outright.
if ($RunTime -match '\{\{.*\}\}') {
    Fail "RunTime is still the placeholder '$RunTime'. Pass a real time, e.g. -RunTime 21:00"
}
if ($RunTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$') {
    Fail "RunTime '$RunTime' is not valid 24-hour HH:mm."
}

$parsedTime = [datetime]::ParseExact($RunTime, 'HH:mm', $null)

Write-Host "Installing the scheduled task '$TaskName'"
Write-Step "runner    : $Wrapper"
Write-Step "run time  : $RunTime daily (local time, UTC+08:00 - same offset as Asia/Manila)"
Write-Step "user      : $env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$Wrapper`"" `
    -WorkingDirectory (Split-Path -Parent $PSScriptRoot)

$trigger = New-ScheduledTaskTrigger -Daily -At $parsedTime

# Interactive logon = the task runs with the user's own token and NO stored
# password. The cost is that the user must be logged on; the alternative
# (-LogonType Password) would mean keeping a plaintext credential.
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 15)

$task = New-ScheduledTask `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Generates one Daily Learnings lesson from recent local Git activity, validates it, and pushes it to GitHub."

# Register-ScheduledTask with -Force updates an existing task in place, which
# is what makes re-running this installer safe.
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

$registered = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Host ""
Write-Host "Installed."
Write-Step "state     : $($registered.State)"
Write-Step "next run  : $($info.NextRunTime)"
Write-Host ""
Write-Host "Behaviour:"
Write-Step "Only one run at a time (a second trigger is ignored while one is running)."
Write-Step "A missed run starts as soon as the machine is available again."
Write-Step "Skipped while there is no network connection."
Write-Step "No password is stored, so the machine must be ON and this user LOGGED ON."
Write-Host ""
Write-Host "Commands:"
Write-Step "test now (dry run) : powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Test"
Write-Step "run the real task  : Start-ScheduledTask -TaskName `"$TaskName`""
Write-Step "check last result  : Get-ScheduledTaskInfo -TaskName `"$TaskName`""
Write-Step "uninstall          : powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall"
Write-Step "logs               : $(Join-Path $PSScriptRoot 'logs')"
