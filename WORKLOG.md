# Daily Learnings — worklog

## STATE (resume here)

**Session started:** 2026-07-25
**Deadline/goal:** ship a working site with one real first lesson, pushed to `main` so Vercel can deploy it.

### Done
- Environment surveyed: native Windows (no usable WSL distro — only a stopped `docker-desktop`), Bun 1.2.21, Node 22.18, Git 2.51. `gh` has two accounts; **`Rejhinald` is authenticated but not active**.
- Scaffolded Next.js **16.2.11** (React 19.2.4, Tailwind **v4**, TS 5.9) into the existing repo without touching `.git`.
- Content layer: `learning-schema.ts` (Zod v4), `learnings.ts` (fs + gray-matter, ordinals, facets, stats, related), `source-safety.ts` (generic sanitisation rules).
- UI: three-column shell, feed + client-side search/filter, lesson page, topics/projects indexes and detail pages, about, 404, theme toggle, mobile nav.
- Shiki dual-theme highlighting (vitesse-light/dark) via an async Server Component; zero JS shipped for code.
- MDX pipeline via `@next/mdx` + custom component map (`Callout`, `Flow`, `Quiz`, `Question`, `Takeaway`).
- `sitemap.ts`, `robots.ts`, build-time RSS into `public/rss.xml`.
- Scripts: `validate-content.ts`, `safety-scan.ts`, `generate-feed.ts`, `new-lesson.ts`.
- **First lesson written**: `2026-07-25-parse-at-the-trust-boundary-instead-of-casting.mdx`.
- `bun run validate:content` → pass. `bun run build` → pass (17 pages, all Static/SSG).

- Automation: prompt, PowerShell runner, shell runner, scheduled-task installer (21:00 local).
- README covering the full specification checklist.
- Browser-verified at 1440px and 390px, light and dark: no page-level horizontal overflow,
  44px touch targets, working mobile nav.
- **Adversarial review pass**: 55 agents across five lenses (privacy, PowerShell, bash, spec
  compliance, frontend/a11y). 41 findings confirmed after adversarial verification, 9 refuted.
  All confirmed findings applied. See "Review fixes worth remembering" below.
- Full gate green: `validate:content`, `lint`, `typecheck`, `build`, `safety:scan`.

### Next queue
1. Commit and push to `origin/main` as Rejhinald.
2. End-to-end `-DryRun` of the daily runner as final proof the automation works.
3. Owner action: connect the repo on Vercel (settings are in the README).

### Decisions worth remembering
- **No WSL distro exists on this machine**, so the PowerShell runner is primary and runs Claude natively; the `.sh` runner is kept for WSL/Git Bash and the `.ps1` auto-detects and delegates to it when a real distro is present.
- **RSS is generated at build time into `public/rss.xml`** rather than served from a route handler, because the spec forbids API routes. `public/rss.xml` is gitignored (build artifact).
- **shadcn/ui was not installed.** The pieces it would have supplied here (card, badge, button, input, separator) are token-styled wrappers already present, and its interactive parts were better served by a native `<details>` (zero JS) and a small nav. Pulling Radix in would have added weight without reducing work. Stated in the README rather than silently skipped.
- **The client-name denylist is gitignored** (`automation/.private-denylist.txt`). Committing a list of client names to a public repo would publish exactly what it protects.
- Streaks are measured against the newest lesson, not "today", so a static build never goes stale.

### Source-repo integrity baseline

Recorded **before** analysis and re-verified after: branch, HEAD and
`git status --porcelain --untracked-files=all` for each inspected repository.
Seven repositories were in scope; one was already dirty before this session began.
All seven matched their baseline afterwards, so nothing was modified.

The per-repository detail deliberately stays out of this file — repository names are
client-identifying and this repo is public. The runner keeps it in the gitignored
`automation/.state/`, and the privacy scan blocks any commit that reintroduces a name here.

---

## Log

### 2026-07-25
- Read the specification, surveyed the environment, ran a read-only recon across the local repositories.
- Two independent repositories surfaced the same teachable gap — a type assertion standing in for a runtime check at an I/O boundary — which is what made it the first lesson.
- Next 16 gotchas hit and fixed: `useMDXComponents()` now takes no arguments; Turbopack needs remark plugins named as strings; `remark-frontmatter` throws on an empty options object; lucide v1 renamed `Home`→`House`, `AlertTriangle`→`TriangleAlert` and dropped brand icons entirely (GitHub mark is now inlined).

### Review fixes worth remembering

Two would have broken the automation outright:

- **PowerShell 5.1 reads `.ps1` as Windows-1252 unless there is a BOM.** An em dash's third UTF-8
  byte (`0x94`) decodes to a smart quote, which PowerShell treats as a string delimiter — so both
  scripts failed to parse. Both are now pure ASCII. Never put a non-ASCII character in a `.ps1`.
- **`$distros.Count` threw under `Set-StrictMode`** because an unwrapped pipeline yields `$null`
  for no matches and a bare string for one. `@()` around it is load-bearing. This aborted the run
  before it reached the native fallback, so *every* scheduled run would have failed.

Also worth keeping in mind:

- `2>$null` on a native command under `$ErrorActionPreference='Stop'` **throws**; git writes to
  stderr routinely. Merging with `2>&1` is fine only after relaxing the preference.
- `$OutputEncoding` defaults to **us-ascii** on 5.1, so anything piped to a native command is
  transcoded and non-ASCII becomes `?`. Verified empirically; setting it to UTF-8 fixes it.
- In bash, `PIPESTATUS[0]` is the *first* stage. The Claude call was a three-stage pipeline, so
  its exit code was never actually checked. The prompt now goes via a temp file so the pipeline
  is two stages.
- `set -e` makes `die` after a bare pipeline unreachable — use `if ! cmd; then die; fi`.
- The privacy scan **caught a real leak in this repo's own WORKLOG**, which listed client
  repository names in an integrity table. That is why the per-repo detail is no longer written here.
