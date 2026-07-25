# Daily Learnings

One programming concept a day, taken from my own recent development work and explained from first
principles.

I work across several codebases and ship features faster than I understand them. A pattern gets
implemented, the types line up, the tests pass — and the *why* never arrives. This is the correction:
every evening a job on my machine reads the day's Git activity across my local repositories, picks
one teachable concept, and publishes a professor-style lesson about the fundamentals underneath it.

The source repositories are private and may contain client work. This repository is public. Every
rule in [Privacy and sanitisation](#privacy-and-sanitisation) follows from those two facts.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript, `strict` |
| Rendering | React Server Components; every page statically generated |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| Content | Local MDX files, compiled by `@next/mdx` |
| Validation | Zod v4, at build time |
| Highlighting | Shiki v4, dual-theme, at build time |
| Icons | Lucide |
| Package manager | Bun |
| Hosting | Vercel |
| Lint | ESLint 9 (flat config) |

There is **no database, no CMS, no API routes, no Server Actions, no authentication and no backend.**

### A note on shadcn/ui

The spec lists shadcn/ui "where it genuinely reduces implementation work". It was evaluated and not
installed. The pieces it would have supplied here — card, badge, button, input, separator — are
token-styled wrappers that already exist in `src/components`, and the interactive parts it is
actually valuable for were better served without it: the knowledge check uses a native `<details>`
element (collapsible with zero JavaScript) and the mobile navigation is a small focus-managed panel.
Pulling in Radix would have added weight without removing work. The project still follows shadcn's
conventions — the `cn()` helper, `clsx` + `tailwind-merge`, token-driven variants — so dropping a
shadcn component in later is a one-line install.

---

## Architecture

```
src/
  app/
    page.tsx                    feed
    learnings/[slug]/page.tsx   lesson (generateStaticParams)
    topics/[topic]/page.tsx     topic pages
    projects/[project]/page.tsx generalised source pages
    sitemap.ts, robots.ts
  components/                   feed card, code block, rails, MDX components
  content/learnings/            THE CONTENT — one .mdx file per lesson
  lib/
    learning-schema.ts          the Zod contract a lesson must satisfy
    learnings.ts                reads, validates and derives everything the UI needs
    source-safety.ts            sanitisation rules
    highlighter.ts              Shiki, server-only
scripts/
  validate-content.ts           schema + links + fingerprints + safety
  safety-scan.ts                privacy scan over the staged diff
  generate-feed.ts              writes public/rss.xml at build time
  new-lesson.ts                 scaffolds a lesson by hand
automation/                     the daily job (see below)
```

Data flows one way. `lib/learnings.ts` reads every MDX file once, validates its frontmatter against
`learning-schema.ts`, and derives ordinals, topics, projects, statistics, related lessons and search
text. Pages consume that. **A malformed lesson fails the build rather than rendering a broken page.**

Six components are Client Components: the theme provider, the theme toggle, the mobile navigation,
the rail navigation (it needs the current path), the feed filter, and the copy button. Everything
else runs on the server. The feed filter is worth noting — it receives cards that were *already
rendered on the server*, so filtering is interactive without shipping any lesson content or
highlighting logic to the browser. The knowledge check is collapsible with no JavaScript at all: it
is a native `<details>` element.

### Why MDX files instead of a database

A database earns its place when you have concurrent writers, relational queries, or content that
changes unpredictably. This has none of those. It is one append-only write per day, by one author,
read-only for everyone else.

Git already provides what a CMS would: history, diffs, review, rollback, and authorship. Putting the
lessons in Postgres would add a service to run, a schema to migrate, a connection to secure and a
backup to manage — in exchange for nothing. Files also mean the validation gate can run in CI and in
the daily job *before* anything is published, which is what makes the privacy guarantees enforceable.

The trade-off is real and worth stating: publishing requires a deploy, and there is no editing UI.
For a once-a-day personal lesson feed, that is the right side of the trade.

---

## Local development

```bash
bun install
bun run dev            # http://localhost:3000

bun run validate:content   # schema, filenames, cross-links, fingerprints, privacy scan
bun run lint
bun run typecheck          # runs `next typegen` first — required on a clean checkout
bun run build              # generates public/rss.xml, then builds
bun run verify             # all four, in order
```

---

## Deploying to Vercel

Import `Rejhinald/daily-learnings` at [vercel.com/new](https://vercel.com/new) and use:

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Install command | `bun install` |
| Build command | `bun run build` |
| Output directory | *(leave default)* |
| Node version | 22.x |
| Root directory | `./` |

**Environment variables: none are required.** The site builds and runs with no configuration.

One is optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute base URL used for canonical tags, Open Graph, the sitemap and the RSS feed. Defaults to `https://daily-learnings.vercel.app`. Set it once the real domain is known. |

After the first import, every push to `main` deploys automatically — which is exactly what the daily
job produces.

---

## Content schema

Each lesson is `src/content/learnings/YYYY-MM-DD-<slug>.mdx`. **The filename's date and slug must
match the frontmatter**, or validation fails.

```yaml
title: string            # 8-120 chars
slug: string             # kebab-case, matches the filename
publishedAt: YYYY-MM-DD  # matches the filename
summary: string          # 40-400 chars, PLAIN TEXT (rendered raw — no markdown)
sourceProject: string    # GENERALISED label, never a client or repository name
language: string
difficulty: beginner | intermediate | advanced
estimatedMinutes: 1-60
topics: string[]         # 1-6
concepts: string[]       # 2-5, rendered as the card's tags
originKind: recent-change | codebase-exploration
sourceFingerprint?: string   # optional, de-duplicates topics across days
relatedSlugs?: string[]      # must resolve to real lessons
```

`sourceFingerprint` is the first 24 hex characters of the SHA-256 of four **sanitised** parts joined
by `|`:

```
<generalised-project-label>|<module-category>|<symbol-category>|<teaching-topic>
```

It contains no paths and nothing client-identifying. It exists so the generator never teaches the
same thing twice.

Components available inside any lesson without an import: `<Callout type="note|insight|warning">`,
`<Flow>`, `<Quiz>` / `<Question q="...">`, `<Takeaway>`, `<Term>`. A fenced code block **with** a
language tag becomes a highlighted code block; a fence **without** one renders as a text diagram.

### The glossary

Jargon is the main thing that makes a lesson bounce off a reader, so the lessons mark it inline:

```mdx
<Term>trust boundary</Term>          looks the term up as written
<Term of="200 ok">200 OK</Term>      when the display text differs from the key
```

The word gets a dotted underline, and the plain-English meaning appears on hover, on tap, or on
keyboard focus — **with no JavaScript**, using `:hover` and `:focus-within`. Definitions live once in
[`src/lib/glossary.ts`](src/lib/glossary.ts) so the same word is always explained the same way, and
the whole dictionary is browsable at `/glossary`.

`bun run validate:content` fails the build if a lesson references a term that is not in the glossary,
since an unknown key would silently render as ordinary text and the reader would lose the definition.

---

## How the daily automation works

The job runs locally, because it needs to see local and possibly unpushed Git changes. A cloud
scheduler cannot.

```
21:00 local
    ↓
Windows Task Scheduler → automation/run-daily-learning.ps1
    ↓
take a lock (never two runs at once)
    ↓
check prerequisites, confirm the remote and the branch, fast-forward main
    ↓
SNAPSHOT every source repository  (branch + HEAD + full working-tree status)
    ↓
build a read-only git digest of recent activity
    ↓
run Claude Code, non-interactive, no shell  →  writes ONE .mdx file
    ↓
RE-CHECK every source repository, and this one  →  any change aborts the run
    ↓
validate content → lint → typecheck → production build
    ↓
stage only the new lesson → privacy scan on the staged diff
    ↓
commit (pathspec-scoped) → push → verify origin/main actually moved
```

**The division of responsibility is deliberate.** Claude may read and search, and write to
`src/content/learnings/` — nothing else. It has **no shell at all**, and no network tools.

That last part is not paranoia, it is a measured decision. Claude Code's permission rules are
*prefix* matches, and a real invocation looks like `git -C <path> log …`. That string matches neither
`Bash(git log:*)` nor `Bash(git commit:*)` — so a read-only allow-list silently blocks all
inspection, while a broader `Bash(git:*)` grant silently *permits* `git -C <path> commit`. Both
behaviours were verified experimentally, the second by accidentally creating a commit in a source
repository during testing. Since the rules cannot separate reading from writing, the script runs the
read-only git commands itself and hands Claude a digest.

Every gate that could cause damage — the integrity check, validation, the privacy scan, the commit,
the push — is owned by the script, not the model. `--dangerously-skip-permissions` is never used, and
the push is never forced.

Nothing is pushed unless every gate passes. Failures leave a clean local state and a non-zero exit
code.

### Install the scheduled task

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File automation\install-scheduled-task.ps1
```

Installs **Daily Learnings Generator**, daily at **21:00 local time**. The machine clock is UTC+08:00
— the same offset as Asia/Manila, with no daylight saving — so local time is Manila time.

For a different time: `-RunTime 08:30`. The installer refuses an unreplaced `{{DAILY_RUN_TIME}}`
placeholder or a malformed time. Re-running it updates the existing task rather than duplicating it.

**The computer must be powered on and this user logged on.** That is a deliberate trade-off: running
regardless of logon requires storing the account password, which the installer will not do. A missed
run (machine asleep or off) starts as soon as the machine is available again, and runs are skipped
while there is no network.

### Run it manually

```powershell
# dry run — generates and validates, never commits or pushes
powershell -NoProfile -ExecutionPolicy Bypass -File automation\run-daily-learning.ps1 -DryRun

# real run
powershell -NoProfile -ExecutionPolicy Bypass -File automation\run-daily-learning.ps1

# commit locally but do not push
powershell -NoProfile -ExecutionPolicy Bypass -File automation\run-daily-learning.ps1 -SkipPush

# via the task itself
Start-ScheduledTask -TaskName "Daily Learnings Generator"
```

On a machine with a real WSL distribution the wrapper delegates to
`automation/run-daily-learning.sh`. This machine has none (only a stopped `docker-desktop`), so it
runs Claude natively on Windows. Force either path with `-ForceNative`.

### Logs

`automation/logs/daily-<timestamp>.log`, one per run. Gitignored — they contain absolute machine
paths.

State (last run, last commit, last published slug) lives in `automation/.state/`, also gitignored.

### Disable or uninstall

```powershell
# pause without removing
Disable-ScheduledTask -TaskName "Daily Learnings Generator"
Enable-ScheduledTask  -TaskName "Daily Learnings Generator"

# remove entirely
powershell -NoProfile -ExecutionPolicy Bypass -File automation\install-scheduled-task.ps1 -Uninstall
```

---

## Troubleshooting

| Exit code | Meaning | What to do |
|---|---|---|
| 2 | Another run holds the lock | Wait, or delete `automation/.state/run.lock` if no run is active |
| 3 | Missing prerequisite | Check `git`, `bun` and `claude` are on PATH and the paths in the log exist |
| 4 | **A source repository changed** | Investigate before re-running. Nothing was committed. See below |
| 5 | Validation failed | Read the log; run `bun run verify` by hand |
| 6 | Privacy scan found something | The lesson was unstaged. Fix or delete it, then re-run |
| 7 | Commit or push failed | Usually the remote moved. The commit is local and safe; resolve by hand |
| 8 | No lesson produced | Claude wrote nothing, or wrote more than one file. Check the log |

**Exit code 4 is the serious one.** It means a repository under the Work Repo root changed while the
job ran. Usually that is innocent — you edited a file, or a dev server wrote to disk. Confirm with
`git -C <repo> status` that nothing unexpected happened, then re-run. The job aborts rather than
guessing, because publishing from a modified source tree is how private code leaks.

**The task never fires.** It only runs while you are logged on. Check `Get-ScheduledTaskInfo -TaskName
"Daily Learnings Generator"` for `LastTaskResult` and `NextRunTime`.

**`tsc` fails on a fresh clone.** Run `bun run typecheck`, which runs `next typegen` first. Next 16
generates route types that a bare `tsc --noEmit` cannot see.

**A lesson renders oddly.** MDX treats `{` and `<` as syntax. Keep type expressions and object
literals inside backticks or a fence. `summary` and `q` are plain-text attributes — backticks render
literally in both.

---

## Privacy and sanitisation

Assume every source repository contains private client code.

**Source repositories are strictly read-only.** The job only ever runs `status --porcelain`, `log`,
`show`, `diff`, `branch`, `rev-parse` and `ls-files` against them. It records each repository's
branch, HEAD and working-tree status *before* analysis and verifies them *after*. Any difference
aborts the publish.

**Snippets are rewritten, never copied.** No lesson reproduces a real function, component, query,
schema or workflow. Examples are standalone illustrations using neutral nouns — Project, Property,
Customer, Record, Quote — written to teach the principle.

**Never published:** absolute local paths, client-identifying branch names, customer information,
private environment variable names, private URLs, credentials, database records, API responses
containing user data, internal IDs, pricing formulas, confidential business logic, whole private
source files, or raw commit hashes from private repositories.

**Two automated gates.** `bun run validate:content` scans every lesson; `bun run safety:scan` scans
the staged diff immediately before the commit. Both check for absolute Windows and POSIX paths,
provider tokens, JWTs, bearer tokens, private keys, database connection strings, emails, phone
numbers, 40-character commit hashes, non-public URLs, suspicious environment variable names and long
numeric identifiers. Lesson content gets the full ruleset; other staged files are checked for secrets
only, since code and documentation legitimately mention things prose must not.

**The client-name denylist is deliberately not committed.** `automation/.private-denylist.txt` holds
the machine-specific terms — client names, product codenames — and is gitignored, because committing
a list of client names to a public repository would publish exactly what the list protects. See
`automation/.private-denylist.example.txt` for the format.

The denylist **fails closed**: if the file is missing, empty, or still an unedited copy of the
example, both gates refuse to run rather than passing with the client-name rule silently disabled.
Terms are matched as substrings and tolerate separators, so `AcmeCorp` also catches `acmeCorpClient`
and `ACME_CORP_TOKEN` — the ways a client name actually reaches a code snippet. On a clone with no
private repositories to protect, set `ALLOW_MISSING_DENYLIST=1` to proceed without one.

If a concept cannot be taught without exposing something, it is not published. There is always
another concept.

---

## Adding a lesson by hand

```bash
bun run new:lesson "Types vanish at runtime"
```

Creates `src/content/learnings/<today>-types-vanish-at-runtime.mdx` with valid frontmatter and the
required section skeleton. Fill it in, then:

```bash
bun run validate:content     # schema, links, fingerprints, full privacy scan
bun run dev                  # read it

git add src/content/learnings/<file>.mdx
bun run safety:scan          # scans the STAGED diff — needs the file staged first
git commit -m "content: add daily learning for <date>"
```

`safety:scan` is the gate the daily job runs immediately before committing, and it only works on a
staged diff — so run it after `git add`, not before. Nothing installs a Git hook for you; if you
want the check enforced automatically, add one:

```bash
printf '#!/bin/sh\nexec bun run safety:scan\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The daily job and a hand-written lesson produce identical files — there is no separate path.

---

## Licence

The lesson content is personal writing. The application code is free to borrow.
