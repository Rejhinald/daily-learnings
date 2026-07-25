/**
 * Pre-commit privacy gate.
 *
 * Scans the staged diff - the exact bytes about to become public - for secrets,
 * absolute local paths and other private data. Lesson content is held to the
 * full ruleset; other staged files are checked for secrets only, since code and
 * documentation legitimately mention things prose must not.
 *
 *   bun run safety:scan
 *
 * Exits non-zero on any blocking finding, which aborts the daily automation
 * before it can push.
 */
import { execFileSync } from "node:child_process";

import { loadDenylist } from "../src/lib/denylist";
import { hasBlockingFinding, scanText, type SafetyFinding } from "../src/lib/source-safety";

const CONTENT_PREFIX = "src/content/learnings/";

/**
 * Files that are allowed to contain a machine-specific path, because setting
 * the automation up requires showing one. They are still checked for secrets.
 */
const LOCAL_PATH_ALLOWED = [
  "README.md",
  "WORKLOG.md",
  "automation/daily-learning-prompt.md",
  "automation/run-daily-learning.ps1",
  "automation/run-daily-learning.sh",
  "automation/install-scheduled-task.ps1",
  "scripts/safety-scan.ts",
  "src/lib/source-safety.ts",
  "src/lib/denylist.ts",
];

interface StagedLine {
  file: string;
  line: string;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

/**
 * Collects the added lines of the staged diff, keyed by file.
 *
 * This is a hunk state machine rather than prefix matching. Inside a hunk every
 * line carries a marker character, so a line of *content* that happens to begin
 * with `+++` or `@@` can never be mistaken for a diff header — which is exactly
 * how a lesson could previously hijack file attribution or skip scanning
 * altogether.
 */
function readStagedAdditions(): StagedLine[] {
  const diff = git(["diff", "--cached", "--no-color", "--unified=0"]);
  const additions: StagedLine[] = [];
  let currentFile = "";
  let inHunk = false;

  for (const line of diff.split(/\r?\n/)) {
    // A new file block resets both the path and the hunk state.
    if (line.startsWith("diff --git ")) {
      currentFile = "";
      inHunk = false;
      continue;
    }
    if (line.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      // Only the file-header block can contain a real `+++ b/path` line.
      if (line.startsWith("+++ ")) {
        const target = line.slice(4).trim();
        currentFile = target === "/dev/null" ? "" : target.replace(/^b\//, "");
      }
      continue;
    }
    // Inside a hunk the first character is the marker; the rest is content,
    // whatever it happens to start with.
    if (line.startsWith("+") && currentFile) {
      additions.push({ file: currentFile, line: line.slice(1) });
    }
  }

  return additions;
}

function main(): number {
  const staged = git(["diff", "--cached", "--name-only"]).split(/\r?\n/).filter(Boolean);

  if (staged.length === 0) {
    console.error("✗ Nothing is staged. Stage the lesson before scanning.");
    return 1;
  }

  let extraTerms: string[];
  try {
    const denylist = loadDenylist();
    extraTerms = denylist.terms;
    console.log(
      denylist.bypassed
        ? "! Denylist bypassed via ALLOW_MISSING_DENYLIST=1 - client-name checking is OFF."
        : `Loaded ${extraTerms.length} local denylist term(s).`,
    );
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : error}`);
    return 1;
  }

  const additions = readStagedAdditions();

  // Group added lines per file so line offsets stay meaningful in the report.
  const byFile = new Map<string, string[]>();
  for (const { file, line } of additions) {
    const existing = byFile.get(file);
    if (existing) existing.push(line);
    else byFile.set(file, [line]);
  }

  // A path the parser produced that git does not list is a parser bug, and a
  // parser bug here means content silently scanned under the wrong ruleset.
  const stagedSet = new Set(staged);
  const unexpected = [...byFile.keys()].filter((file) => !stagedSet.has(file));
  if (unexpected.length > 0) {
    console.error(
      `✗ Diff parser produced paths git did not stage: ${unexpected.join(", ")}`,
    );
    return 1;
  }

  let blocking = 0;
  let warnings = 0;

  for (const [file, lines] of byFile) {
    const isLesson = file.startsWith(CONTENT_PREFIX);
    const findings: SafetyFinding[] = scanText(lines.join("\n"), {
      extraTerms,
      secretsOnly: !isLesson,
      skipRules: LOCAL_PATH_ALLOWED.includes(file)
        ? ["absolute-windows-path", "absolute-unix-home"]
        : [],
    });

    for (const finding of findings) {
      const marker = finding.severity === "block" ? "✗" : "!";
      console.error(
        `  ${marker} ${file} [${finding.ruleId}] ${finding.description}\n      matched: ${finding.excerpt}`,
      );
    }

    if (hasBlockingFinding(findings)) blocking += 1;
    warnings += findings.filter((finding) => finding.severity === "warn").length;
  }

  console.log(
    `\nScanned ${byFile.size} staged file(s): ${blocking} with blocking findings, ${warnings} warning(s).`,
  );

  if (blocking > 0) {
    console.error("✗ Safety scan failed. Nothing has been committed.");
    return 1;
  }

  console.log("✓ Safety scan passed.");
  return 0;
}

try {
  process.exit(main());
} catch (error) {
  console.error("✗ Safety scan could not run.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
