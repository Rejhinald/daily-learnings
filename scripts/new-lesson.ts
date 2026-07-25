/**
 * Scaffolds an empty lesson with valid frontmatter and the required sections.
 *
 *   bun run new:lesson "Types vanish at runtime"
 *
 * Useful when writing a lesson by hand; the daily automation writes its own
 * file directly.
 */
import fs from "node:fs";
import path from "node:path";

const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error('Usage: bun run new:lesson "Lesson title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const today = new Date().toISOString().slice(0, 10);
const file = path.join(process.cwd(), "src", "content", "learnings", `${today}-${slug}.mdx`);

if (fs.existsSync(file)) {
  console.error(`✗ ${path.basename(file)} already exists.`);
  process.exit(1);
}

const template = `---
title: "${title}"
slug: "${slug}"
publishedAt: "${today}"
summary: "One or two sentences on what this teaches and why it matters. At least 40 characters."
sourceProject: "Internal web application"
language: "TypeScript"
difficulty: "intermediate"
estimatedMinutes: 7
topics:
  - "TypeScript"
concepts:
  - "concept one"
  - "concept two"
originKind: "recent-change"
relatedSlugs: []
---

## Today's idea

One or two plain-English sentences.

## Why it appeared

The kind of problem this was solving — no confidential detail.

## Mental model

An analogy that makes the concept stick.

## The snippet

\`\`\`ts
// 8-30 lines, rewritten and generalised. Neutral names only.
export function example(): void {}
\`\`\`

## Vocabulary

**term** — what it is, what it does, why it is here, and what breaks without it.

## Walkthrough

Explain the snippet in logical blocks.

## Data flow

\`\`\`
Input
  ↓
Validation
  ↓
Result
\`\`\`

## Why this approach

Why this instead of the simpler alternative.

## Common mistakes

Two or three realistic errors.

## Mini exercise

One small change to test understanding. Never requires touching a private repo.

<Quiz>
  <Question q="First question?">Answer.</Question>
  <Question q="Second question?">Answer.</Question>
  <Question q="Third question?">Answer.</Question>
</Quiz>

<Takeaway>
One memorable principle.
</Takeaway>
`;

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, template, "utf8");
console.log(`✓ created src/content/learnings/${path.basename(file)}`);
