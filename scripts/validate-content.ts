/**
 * Content gate.
 *
 * Checks every lesson before it can be built or committed: frontmatter matches
 * the schema, filenames agree with their metadata, cross-links resolve, no two
 * lessons repeat a fingerprint, and nothing private made it into the prose.
 *
 *   bun run validate:content
 *
 * Exits non-zero on any failure, which is what stops the daily automation from
 * committing a broken or unsafe lesson.
 */
import fs from "node:fs";
import path from "node:path";

import { loadDenylist } from "../src/lib/denylist";
import { lookupTerm } from "../src/lib/glossary";
import { CONTENT_DIR, getAllLearnings, LessonValidationError } from "../src/lib/learnings";
import { hasBlockingFinding, scanText, type SafetyFinding } from "../src/lib/source-safety";

/**
 * Finds every `<Term>` in a lesson and returns the glossary keys it asks for.
 * `<Term of="x">y</Term>` looks up x; `<Term>y</Term>` looks up y.
 */
function termKeys(body: string): string[] {
  const keys: string[] = [];
  const pattern = /<Term(?:\s+of="([^"]*)")?\s*>([\s\S]*?)<\/Term>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    // Strip markdown emphasis and code ticks from the display text before
    // using it as a key, so <Term>`any`</Term> resolves to "any".
    keys.push((match[1] ?? match[2]).replace(/[`*_]/g, "").trim());
  }
  return keys;
}

function reportFindings(file: string, findings: SafetyFinding[]): void {
  for (const finding of findings) {
    const marker = finding.severity === "block" ? "✗" : "!";
    console.error(
      `  ${marker} ${file}:${finding.line}:${finding.column} [${finding.ruleId}] ${finding.description}`,
    );
    console.error(`      matched: ${finding.excerpt}`);
  }
}

function main(): number {
  // Fails closed: without a denylist the client-name rule would do nothing
  // while this gate still reported success.
  let extraTerms: string[];
  try {
    const denylist = loadDenylist();
    extraTerms = denylist.terms;
    console.log(
      denylist.bypassed
        ? "! Denylist bypassed via ALLOW_MISSING_DENYLIST=1 — client-name checking is OFF."
        : `Loaded ${extraTerms.length} local denylist term(s).`,
    );
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : error}`);
    return 1;
  }

  let learnings;
  try {
    learnings = getAllLearnings();
  } catch (error) {
    if (error instanceof LessonValidationError) {
      console.error("\n✗ Frontmatter validation failed:\n");
      console.error(error.failures.join("\n\n"));
      return 1;
    }
    throw error;
  }

  if (learnings.length === 0) {
    console.error("✗ No lessons found. The site needs at least one lesson.");
    return 1;
  }

  let failed = false;
  const slugs = new Set(learnings.map((learning) => learning.slug));
  const fingerprints = new Map<string, string>();
  const sequences = new Map<number, string>();

  // Two lessons sharing a publication day need distinct sequences, or nothing
  // can say which came first and the lesson numbers come out arbitrary.
  const byDate = new Map<string, typeof learnings>();
  for (const learning of learnings) {
    const sameDay = byDate.get(learning.publishedAt) ?? [];
    sameDay.push(learning);
    byDate.set(learning.publishedAt, sameDay);
  }
  for (const [date, sameDay] of byDate) {
    if (sameDay.length < 2) continue;
    const missing = sameDay.filter((l) => l.sequence === undefined);
    if (missing.length > 0) {
      console.error(
        `  ✗ ${date}: ${sameDay.length} lessons share this date but ${missing.length} lack a "sequence", so their order is undefined: ${missing
          .map((l) => l.slug)
          .join(", ")}`,
      );
      failed = true;
    }
  }

  for (const learning of learnings) {
    const file = `${learning.publishedAt}-${learning.slug}.mdx`;
    const fullPath = path.join(CONTENT_DIR, file);

    // Cross-links must point at lessons that exist, or the page 404s in place.
    for (const related of learning.relatedSlugs) {
      if (!slugs.has(related)) {
        console.error(`  ✗ ${file}: relatedSlugs references unknown lesson "${related}"`);
        failed = true;
      }
      if (related === learning.slug) {
        console.error(`  ✗ ${file}: relatedSlugs references itself`);
        failed = true;
      }
    }

    // A repeated fingerprint means the generator taught the same thing twice.
    if (learning.sourceFingerprint) {
      const previous = fingerprints.get(learning.sourceFingerprint);
      if (previous) {
        console.error(
          `  ✗ ${file}: sourceFingerprint already used by ${previous} — the topic is a repeat`,
        );
        failed = true;
      }
      fingerprints.set(learning.sourceFingerprint, file);
    }

    // A duplicate sequence makes two lessons claim the same position.
    if (learning.sequence !== undefined) {
      const previous = sequences.get(learning.sequence);
      if (previous) {
        console.error(
          `  ✗ ${file}: sequence ${learning.sequence} is already used by ${previous}`,
        );
        failed = true;
      }
      sequences.set(learning.sequence, file);
    }

    // A lesson with no code teaches nothing a paragraph could not.
    if (!learning.preview) {
      console.error(`  ✗ ${file}: no fenced code block found — every lesson needs a snippet`);
      failed = true;
    }

    // An unknown glossary key renders as plain text, so the reader silently
    // loses the definition. Catch it here instead of shipping a dead term.
    for (const key of termKeys(learning.body)) {
      if (!lookupTerm(key)) {
        console.error(
          `  ✗ ${file}: <Term> refers to "${key}", which is not in src/lib/glossary.ts`,
        );
        failed = true;
      }
    }

    // Inline code that names a glossary term is wrapped automatically, so
    // wrapping it by hand too nests a <button> inside a <button> — invalid
    // HTML that breaks hydration at runtime rather than at build time.
    const redundant = /<Term\b[^>]*>\s*`[^`]+`\s*<\/Term>/g;
    for (const match of learning.body.matchAll(redundant)) {
      console.error(
        `  ✗ ${file}: remove the <Term> around ${match[0].replace(/<[^>]+>/g, "")} — inline code is linked to the glossary automatically, and wrapping it twice nests a button inside a button`,
      );
      failed = true;
    }

    const findings = scanText(fs.readFileSync(fullPath, "utf8"), { extraTerms });
    if (findings.length > 0) {
      reportFindings(file, findings);
      if (hasBlockingFinding(findings)) failed = true;
    }
  }

  if (failed) {
    console.error("\n✗ Content validation failed.");
    return 1;
  }

  console.log(
    `\n✓ ${learnings.length} lesson(s) valid — schema, filenames, links, fingerprints and safety scan all pass.`,
  );
  return 0;
}

process.exit(main());
