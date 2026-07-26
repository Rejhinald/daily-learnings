#!/usr/bin/env bash
#
# Generates, validates and publishes one Daily Learnings lesson.
#
# This is the WSL / Git Bash runner. On a machine with a real WSL distribution
# the PowerShell wrapper delegates here; on a Windows-only machine the wrapper
# runs Claude natively instead and this script is unused.
#
# Claude is given a narrow set of permissions and writes exactly one lesson
# file. This script owns everything that could do damage: the source-repository
# integrity check, validation, the privacy scan, the commit and the push.
# Nothing is published unless every gate passes.
#
# Usage:
#   ./automation/run-daily-learning.sh [--dry-run] [--skip-push] [--no-lock]
#
# Exit codes:
#   0 success                    5 validation failed
#   2 another run holds the lock 6 privacy scan found something
#   3 a prerequisite is missing  7 commit or push failed
#   4 a repository was modified  8 no new lesson produced

set -Eeuo pipefail
IFS=$'\n\t'

DRY_RUN=0
SKIP_PUSH=0
NO_LOCK=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=1 ;;
    --skip-push) SKIP_PUSH=1 ;;
    # Set by the PowerShell wrapper, which already holds the lock. Windows and
    # WSL PIDs are different namespaces, so a second lock here would look stale
    # and get taken over, then deleted out from under the wrapper.
    --no-lock)   NO_LOCK=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 3 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
WORK_REPO_ROOT="${WORK_REPO_ROOT:-$(dirname "$REPO_DIR")}"
GITHUB_ACCOUNT="${GITHUB_ACCOUNT:-Rejhinald}"
EXPECTED_REMOTE="https://github.com/Rejhinald/daily-learnings.git"

# GitHub attributes a commit by the email INSIDE it, not by whoever pushed.
# Without this the nightly commit inherits the machine's global identity and
# lands under a different GitHub account than the one that owns the repo.
GIT_AUTHOR_NAME_="${GIT_AUTHOR_NAME_:-Arwin Miclat}"
GIT_AUTHOR_EMAIL_="${GIT_AUTHOR_EMAIL_:-113625337+Rejhinald@users.noreply.github.com}"

LOG_DIR="$SCRIPT_DIR/logs"
STATE_DIR="$SCRIPT_DIR/.state"
LOCK_FILE="$STATE_DIR/run.lock"
PROMPT_FILE="$SCRIPT_DIR/daily-learning-prompt.md"
DENYLIST_FILE="$SCRIPT_DIR/.private-denylist.txt"
CONTENT_DIR="$REPO_DIR/src/content/learnings"

mkdir -p "$LOG_DIR" "$STATE_DIR"
LOG_FILE="$LOG_DIR/daily-$(date +%Y-%m-%d_%H%M%S).log"
TODAY="$(date +%Y-%m-%d)"

log() {
  local level="${2:-INFO}"
  printf '[%s] %-4s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$level" "$1" | tee -a "$LOG_FILE"
}

die() {
  local code="$1"; shift
  log "$*" FAIL
  log "Log written to $LOG_FILE"
  exit "$code"
}

# The `if` form matters: a bare `[ ... ] && rm` returns non-zero when the test
# fails, and a trap's exit status replaces the script's - which silently
# rewrote exit 2 ("another run in progress") to 1.
cleanup() {
  if [ -n "${LOCK_HELD:-}" ]; then rm -f "$LOCK_FILE"; fi
  return 0
}
trap cleanup EXIT
trap 'die 1 "Interrupted."' INT TERM

# ---- 1. lock ---------------------------------------------------------------
if [ "$NO_LOCK" -eq 0 ]; then
  if [ -e "$LOCK_FILE" ]; then
    holder="$(cat "$LOCK_FILE" 2>/dev/null || echo "")"
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
      echo "Another run is already in progress (PID $holder)." >&2
      exit 2
    fi
    log "Found a stale lock (holder '$holder'); taking it over." WARN
  fi
  echo "$$" > "$LOCK_FILE"
  LOCK_HELD=1
fi

log "Daily Learnings run starting. Repo: $REPO_DIR"

# ---- 2. prerequisites ------------------------------------------------------
for tool in git bun claude; do
  command -v "$tool" >/dev/null 2>&1 || die 3 "Required tool '$tool' is not on PATH."
done
# The denylist is a prerequisite, not an optional extra: without it the
# client-name rule is silently disabled while the gates still pass.
for path in "$REPO_DIR" "$PROMPT_FILE" "$CONTENT_DIR" "$WORK_REPO_ROOT" "$DENYLIST_FILE"; do
  [ -e "$path" ] || die 3 "Required path is missing: $path"
done
log "Prerequisites present." OK

cd "$REPO_DIR"

remote="$(git remote get-url origin 2>/dev/null || echo "")"
[ "$remote" = "$EXPECTED_REMOTE" ] || die 3 "origin is '$remote', expected '$EXPECTED_REMOTE'."

# Without this, a run started on a feature branch would push nothing while
# still reporting success. `--abbrev-ref HEAD` also yields "HEAD" when detached.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
[ "$branch" = "main" ] || die 3 "Repository is on branch '$branch', expected 'main'. Nothing was generated or pushed."

# ---- 3. refresh main without discarding human work -------------------------
dirty_before="$(git status --porcelain)"
[ -n "$dirty_before" ] && log "Working tree has uncommitted changes; they will be left alone." WARN

if git fetch origin main >>"$LOG_FILE" 2>&1; then
  behind="$(git rev-list --count HEAD..origin/main)"
  if [ "$behind" != "0" ]; then
    if [ -z "$dirty_before" ]; then
      # Fast-forward only; a merge here could rewrite human work.
      git merge --ff-only origin/main >>"$LOG_FILE" 2>&1 \
        || die 7 "Cannot fast-forward onto origin/main. Resolve by hand."
      log "Fast-forwarded $behind commit(s)." OK
    else
      die 7 "Local is $behind commit(s) behind origin/main and the tree is dirty. Resolve by hand."
    fi
  fi
else
  log "git fetch failed - continuing with the local checkout." WARN
fi

# ---- 4. source repository integrity baseline -------------------------------
if command -v md5sum >/dev/null 2>&1; then
  hash_cmd() { md5sum | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  hash_cmd() { shasum -a 256 | cut -d' ' -f1; }
else
  die 3 "Neither md5sum nor shasum is available; cannot fingerprint source repositories."
fi

# Branch + HEAD + full porcelain hash. --untracked-files=all keeps a new
# directory from collapsing into one '?? dir/' entry that hides its contents.
snapshot_repos() {
  local out="$1"
  : > "$out"
  while IFS= read -r gitdir; do
    local dir; dir="$(dirname "$gitdir")"
    case "$dir" in
      *"/daily-learnings"|*"/node_modules/"*|*"/.next/"*|*"/dist/"*|*"/build/"*) continue ;;
    esac
    printf '%s\t%s\t%s\t%s\n' \
      "$dir" \
      "$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')" \
      "$(git -C "$dir" rev-parse HEAD 2>/dev/null || echo '?')" \
      "$(git -C "$dir" status --porcelain --untracked-files=all 2>/dev/null | hash_cmd)" >> "$out"
  done < <(find "$WORK_REPO_ROOT" -maxdepth 3 -type d -name .git -not -path "*/node_modules/*" 2>/dev/null)
  sort -o "$out" "$out"
}

BEFORE_SNAPSHOT="$STATE_DIR/repos-before.tsv"
AFTER_SNAPSHOT="$STATE_DIR/repos-after.tsv"
log "Snapshotting source repositories under $WORK_REPO_ROOT ..."
snapshot_repos "$BEFORE_SNAPSHOT"
log "Baseline recorded for $(wc -l < "$BEFORE_SNAPSHOT" | tr -d ' ') source repositor(ies)." OK

# Baseline for this repository too: the validation gates that run later are
# scripts inside this tree, so a run that rewrote them would mark its own work.
self_before="$(git status --porcelain --untracked-files=all)"
lessons_before="$(ls -1 "$CONTENT_DIR"/*.mdx 2>/dev/null | sort || true)"

# ---- 5. generate -----------------------------------------------------------
# Build the read-only digest Claude reads instead of running git itself.
#
# Claude Code's permission rules are PREFIX matches, and every real call looks
# like `git -C <path> log ...` - which matches neither `Bash(git log:*)` (so
# inspection is silently blocked) nor `Bash(git commit:*)` (so a write is
# silently ALLOWED). Verified both ways. Since the rules cannot separate reading
# from writing, Claude gets no git and no shell at all.
DIGEST_FILE="$STATE_DIR/git-digest.md"
{
  printf '# Recent activity digest\n\n'
  printf 'Generated by the runner. Every command below was read-only.\n'
  printf 'Use the paths to Read/Grep the actual source files for context -\n'
  printf 'a diff alone is never enough to teach from.\n\n'
  while IFS=$'\t' read -r dir br _head _hash; do
    [ -n "$dir" ] || continue
    commits="$(git -C "$dir" log -15 --format='%cI%x09%s' 2>/dev/null || true)"
    porcelain="$(git -C "$dir" status --porcelain --untracked-files=all 2>/dev/null | head -40 || true)"
    [ -n "$commits" ] || [ -n "$porcelain" ] || continue
    printf '## %s\npath: %s\nbranch: %s\n\n' "$(basename "$dir")" "$dir" "$br"
    if [ -n "$commits" ]; then
      printf '### Recent commits\n```\n%s\n```\n\n' "$commits"
      printf '### Files touched recently\n```\n%s\n```\n\n' \
        "$(git -C "$dir" log -8 --name-only --format= 2>/dev/null | sed '/^$/d' | sort -u | head -40 || true)"
    fi
    [ -n "$porcelain" ] && printf '### Uncommitted right now\n```\n%s\n```\n\n' "$porcelain"
    printf '### Working-tree diffstat\n```\n%s\n```\n\n' \
      "$(git -C "$dir" diff --stat HEAD 2>/dev/null | head -30 || true)"
  done < "$BEFORE_SNAPSHOT"
} > "$DIGEST_FILE"
log "Digest written to $DIGEST_FILE" OK

# --dangerously-skip-permissions is never used.
ALLOWED=(
  Read Glob Grep TodoWrite
  'Write(src/content/learnings/**)' 'Edit(src/content/learnings/**)'
)
DISALLOWED=(
  Bash Task WebFetch WebSearch
  'Read(**/.env)' 'Read(**/.env.*)'
)

# The prompt goes to a file so the pipeline below is exactly two stages and
# PIPESTATUS[0] unambiguously belongs to claude.
PROMPT_TMP="$STATE_DIR/prompt-$$.md"
{
  printf 'Today is %s. Generate today'"'"'s Daily Learnings lesson.\n\n' "$TODAY"
  printf 'You have NO git access and NO shell this run. Everything you need about recent activity\n'
  printf 'has already been collected for you, read-only, here:\n\n    %s\n\n' "$DIGEST_FILE"
  printf 'Read that file first. It lists each source repository, its branch, its recent commits, the\n'
  printf 'files touched recently, and anything uncommitted. Then use Read/Glob/Grep on the paths it\n'
  printf 'names to study the surrounding implementation - a diff alone is never enough context.\n\n'
  printf 'The Work Repo root is readable. Your working directory is the daily-learnings repository,\n'
  printf 'and the only place you may write is src/content/learnings/.\n\n'
  cat "$PROMPT_FILE"
} > "$PROMPT_TMP"

log "Invoking Claude Code in non-interactive print mode ..."
set +e
# --strict-mcp-config with no --mcp-config loads ZERO MCP servers. Without it
# the nested run inherits whatever is configured on this machine, and the
# browser-driving ones (Playwright, three.js devtools) launch Chrome with a
# remote-debugging port every night. A lesson writer needs no browser.
claude --print \
    --add-dir "$WORK_REPO_ROOT" \
    --permission-mode default \
    --strict-mcp-config \
    --allowedTools "${ALLOWED[@]}" \
    --disallowedTools "${DISALLOWED[@]}" < "$PROMPT_TMP" 2>&1 | tee -a "$LOG_FILE"
claude_exit="${PIPESTATUS[0]}"
set -e
rm -f "$PROMPT_TMP"
log "Claude exited with $claude_exit"

# ---- 6. integrity re-check (runs even if Claude failed) --------------------
log "Re-checking source repositories ..."
snapshot_repos "$AFTER_SNAPSHOT"
if ! diff -q "$BEFORE_SNAPSHOT" "$AFTER_SNAPSHOT" >/dev/null; then
  # Claude has no shell and can only write inside src/content/learnings, so it
  # cannot run git. A moved HEAD or switched branch is therefore the signature
  # of something running git commands, and is worth aborting over. A changed
  # working-tree hash is what happens when you edit your own code at 21:00,
  # which is exactly when this runs -- reported loudly, but not fatal.
  severe=0
  while IFS=$'\t' read -r dir br head _hash; do
    after_line="$(grep -F "$dir	" "$AFTER_SNAPSHOT" || true)"
    [ -n "$after_line" ] || { log "TAMPERED: $dir (disappeared during the run)" FAIL; severe=1; continue; }
    a_br="$(printf '%s' "$after_line" | cut -f2)"
    a_head="$(printf '%s' "$after_line" | cut -f3)"
    if [ "$br" != "$a_br" ]; then log "TAMPERED: $dir (branch $br -> $a_br)" FAIL; severe=1
    elif [ "$head" != "$a_head" ]; then log "TAMPERED: $dir (HEAD moved - a git command ran)" FAIL; severe=1
    else
      a_hash="$(printf '%s' "$after_line" | cut -f4)"
      [ "$_hash" = "$a_hash" ] || log "EDITED DURING RUN: $dir (working tree edited)" WARN
    fi
  done < "$BEFORE_SNAPSHOT"

  [ "$severe" -eq 0 ] \
    || die 4 "A source repository's git state moved during the run. Publishing aborted; nothing was committed."
  [ "${STRICT_SOURCE_REPOS:-0}" != "1" ] \
    || die 4 "A source repository's working tree changed and STRICT_SOURCE_REPOS=1. Publishing aborted."
  log "Working-tree edits are almost certainly yours - this job cannot write outside src/content/learnings. Continuing." WARN
else
  log "All source repositories unchanged (tracked and untracked files)." OK
fi

# This repository too, BEFORE running any of its scripts. The only acceptable
# difference is one or more new untracked lesson files.
self_after="$(git status --porcelain --untracked-files=all)"
if [ "$self_after" != "$self_before" ]; then
  unexpected="$(comm -13 <(printf '%s\n' "$self_before" | sort) <(printf '%s\n' "$self_after" | sort) \
    | grep -v -E '^\?\? "?src/content/learnings/.+\.mdx"?$' || true)"
  if [ -n "$unexpected" ]; then
    printf '%s\n' "$unexpected" | tee -a "$LOG_FILE"
    die 4 "Claude changed files outside src/content/learnings. The validation gates were not run against a modified tree."
  fi
fi
log "This repository changed only inside src/content/learnings." OK

[ "$claude_exit" -eq 0 ] || die 1 "Claude Code failed with exit code $claude_exit."

# ---- 7. exactly one new lesson --------------------------------------------
lessons_after="$(ls -1 "$CONTENT_DIR"/*.mdx 2>/dev/null | sort || true)"
new_lessons="$(comm -13 <(printf '%s\n' "$lessons_before") <(printf '%s\n' "$lessons_after") | sed '/^$/d')"
new_count="$(printf '%s\n' "$new_lessons" | sed '/^$/d' | wc -l | tr -d ' ')"
[ "$new_count" -ne 0 ] || die 8 "No new lesson file was created. Nothing to publish."
[ "$new_count" -eq 1 ] || die 8 "Expected exactly one new lesson, found $new_count."
lesson_rel="src/content/learnings/$(basename "$new_lessons")"
log "New lesson: $lesson_rel" OK

# ---- 8. validation ---------------------------------------------------------
# `if !` is exempt from set -e, so die 5 is actually reachable. A bare pipeline
# would abort the script first, with no log line and the wrong exit code.
for step in "validate:content|content validation" "lint|lint" "typecheck|typecheck" "build|production build"; do
  script="${step%%|*}"; label="${step##*|}"
  log "Running $label ..."
  if ! bun run "$script" 2>&1 | tee -a "$LOG_FILE"; then
    die 5 "$label failed. Nothing was committed."
  fi
  log "$label passed." OK
done

if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry run: stopping before staging. The lesson is on disk at $lesson_rel." OK
  exit 0
fi

# ---- 9. stage only the lesson ---------------------------------------------
git add -- "$lesson_rel"
[ -n "$(git diff --cached --name-only)" ] || die 8 "Nothing staged - refusing to create an empty commit."

log "Running the privacy scan on the staged diff ..."
if ! bun run safety:scan 2>&1 | tee -a "$LOG_FILE"; then
  git reset -- "$lesson_rel" >/dev/null 2>&1 || true
  die 6 "Privacy scan failed. The lesson was unstaged and nothing was committed."
fi
log "Privacy scan passed." OK

# ---- 10. commit and push ---------------------------------------------------
# --only with an explicit pathspec commits exactly the lesson, so anything the
# human had already staged stays staged and unpublished. The message must come
# before `--`, or git reads it as a pathspec.
git -c "user.name=$GIT_AUTHOR_NAME_" -c "user.email=$GIT_AUTHOR_EMAIL_" \
  commit --only -m "content: add daily learning for $TODAY" -- "$lesson_rel" >>"$LOG_FILE" 2>&1 \
  || die 7 "Commit failed."
commit="$(git rev-parse --short HEAD)"
log "Committed $commit as $GIT_AUTHOR_NAME_ <$GIT_AUTHOR_EMAIL_>" OK

if [ "$SKIP_PUSH" -eq 1 ]; then
  log "--skip-push set. Commit $commit is local." OK
  exit 0
fi

# This machine has two authenticated GitHub accounts and the other one is
# active by default, so the push would otherwise use the wrong credential.
if command -v gh >/dev/null 2>&1; then
  gh auth switch --hostname github.com --user "$GITHUB_ACCOUNT" >/dev/null 2>&1 || true
fi

# Never forced. If the remote moved, rebase and re-validate before retrying.
if ! git push origin main >>"$LOG_FILE" 2>&1; then
  log "Push rejected - the remote likely moved. Fetching and retrying once." WARN
  git fetch origin main >>"$LOG_FILE" 2>&1 || die 7 "Fetch failed."
  if ! git rebase origin/main >>"$LOG_FILE" 2>&1; then
    git rebase --abort >/dev/null 2>&1 || true
    die 7 "Could not rebase onto origin/main safely. Commit $commit is local; resolve by hand. Nothing was overwritten."
  fi
  log "Rebased. Re-running validation before pushing ..."
  bun run validate:content >>"$LOG_FILE" 2>&1 || die 5 "Validation failed after the rebase."
  bun run build >>"$LOG_FILE" 2>&1 || die 5 "Build failed after the rebase."
  git push origin main >>"$LOG_FILE" 2>&1 || die 7 "Push still failed. Commit $commit is local and safe."
fi

# A push that printed "Everything up-to-date" exits 0 without publishing
# anything, so confirm the remote ref actually moved to our commit.
pushed_sha="$(git rev-parse origin/main 2>/dev/null || echo '')"
[ "$pushed_sha" = "$(git rev-parse HEAD)" ] \
  || die 7 "Push reported success but origin/main is '$pushed_sha', not '$(git rev-parse HEAD)'. Nothing was published."

# State is gitignored: it records machine paths and per-repository pointers.
printf '{"lastRunAt":"%s","lastCommit":"%s","lastLesson":"%s"}\n' \
  "$(date -Iseconds)" "$commit" "$(basename "$lesson_rel")" > "$STATE_DIR/state.json"

log "Pushed $commit to origin/main. Vercel will deploy it." OK
log "Log written to $LOG_FILE"
