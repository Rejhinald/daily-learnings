import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  formatIssues,
  learningFrontmatterSchema,
  type CodePreview,
  type Learning,
  type LessonHeading,
} from "@/lib/learning-schema";

/**
 * The content layer.
 *
 * Every lesson is an MDX file on disk. This module reads them once, validates
 * the frontmatter, and derives everything the UI needs — feed cards, topic
 * pages, statistics, related lessons. There is no database because the Git
 * history already provides authorship, versioning, review and rollback for a
 * write-once-per-day corpus.
 */

export const CONTENT_DIR = path.join(process.cwd(), "src", "content", "learnings");

const FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.mdx$/;
const WORDS_PER_MINUTE = 210;
const PREVIEW_MAX_LINES = 12;

export class LessonValidationError extends Error {
  constructor(public readonly failures: string[]) {
    super(`Lesson validation failed:\n${failures.join("\n\n")}`);
    this.name = "LessonValidationError";
  }
}

let cachedLearnings: Learning[] | null = null;

function listLessonFiles(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .sort();
}

/**
 * Pulls the first fenced code block out of the body for the feed card preview.
 * Long blocks are cut down so a card never turns into a wall of code.
 */
function extractPreview(body: string): CodePreview | null {
  const lines = body.split(/\r?\n/);
  let openIndex = -1;
  let openTicks = 0;
  let language = "text";

  for (let i = 0; i < lines.length; i += 1) {
    if (openIndex === -1) {
      // Opening fence: three or more backticks, an optional language token, and
      // an optional meta string (```ts title="x") which remark accepts and we
      // drop. A regex that ignored the meta string would run past the closing
      // fence and render prose as if it were code.
      const open = /^(`{3,})[ \t]*([A-Za-z0-9+#-]*)/.exec(lines[i]);
      if (!open) continue;
      openIndex = i;
      openTicks = open[1].length;
      language = open[2].trim() || "text";
      continue;
    }

    // Closing fence: a bare run of at least as many backticks, nothing after
    // it. Tracking the run length is what makes nested ```` blocks work.
    const close = /^(`{3,})[ \t]*$/.exec(lines[i]);
    if (!close || close[1].length < openTicks) continue;

    const content = lines.slice(openIndex + 1, i);
    while (content.length > 0 && content[0].trim() === "") content.shift();
    while (content.length > 0 && content[content.length - 1].trim() === "") content.pop();

    return {
      language,
      code: content.slice(0, PREVIEW_MAX_LINES).join("\n"),
      hiddenLines: Math.max(0, content.length - PREVIEW_MAX_LINES),
    };
  }

  return null;
}

/** Turns any human label into a URL-safe segment. */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Collects `##` headings, ignoring anything inside a fenced code block. */
function extractHeadings(body: string): LessonHeading[] {
  const headings: LessonHeading[] = [];
  let insideFence = false;

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      // Strip inline markup so the id computed here matches the one the MDX
      // heading component derives from the *rendered* text. A link left as
      // `[text](url)` would slugify differently and break the anchor.
      const text = match[1]
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .trim();
      headings.push({ id: toSlug(text), text });
    }
  }

  return headings;
}

function countWords(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-|]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function readAllLearnings(): Learning[] {
  const failures: string[] = [];
  const learnings: Learning[] = [];
  const seenSlugs = new Map<string, string>();

  for (const file of listLessonFiles()) {
    const nameMatch = FILENAME_PATTERN.exec(file);
    if (!nameMatch) {
      failures.push(
        `${file}\n  - filename must look like YYYY-MM-DD-lesson-slug.mdx`,
      );
      continue;
    }

    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");

    // Malformed YAML throws out of gray-matter. Catching it here turns a raw
    // stack trace into the same per-file report every other failure gets.
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      failures.push(
        `${file}\n  - frontmatter is not valid YAML: ${
          error instanceof Error ? error.message.split("\n")[0] : String(error)
        }`,
      );
      continue;
    }

    const result = learningFrontmatterSchema.safeParse(parsed.data);

    if (!result.success) {
      failures.push(`${file}\n${formatIssues(result.error)}`);
      continue;
    }

    const frontmatter = result.data;
    const [, filenameDate, filenameSlug] = nameMatch;

    if (filenameDate !== frontmatter.publishedAt) {
      failures.push(
        `${file}\n  - filename date ${filenameDate} does not match publishedAt ${frontmatter.publishedAt}`,
      );
      continue;
    }
    if (filenameSlug !== frontmatter.slug) {
      failures.push(
        `${file}\n  - filename slug "${filenameSlug}" does not match frontmatter slug "${frontmatter.slug}"`,
      );
      continue;
    }

    const previousFile = seenSlugs.get(frontmatter.slug);
    if (previousFile) {
      failures.push(
        `${file}\n  - duplicate slug "${frontmatter.slug}" (already used by ${previousFile})`,
      );
      continue;
    }
    seenSlugs.set(frontmatter.slug, file);

    const body = parsed.content.trim();
    learnings.push({
      ...frontmatter,
      ordinal: 0, // assigned below, once the full set is ordered
      body,
      preview: extractPreview(body),
      headings: extractHeadings(body),
      readingMinutes: Math.max(1, Math.round(countWords(body) / WORDS_PER_MINUTE)),
    });
  }

  if (failures.length > 0) throw new LessonValidationError(failures);

  // Newest first. Same-day lessons fall back to slug for a stable order.
  const ordered = learnings.sort((a, b) =>
    a.publishedAt === b.publishedAt
      ? a.slug.localeCompare(b.slug)
      : b.publishedAt.localeCompare(a.publishedAt),
  );

  // Ordinals count up from the oldest lesson, so lesson 001 never changes
  // identity when a new one is published.
  const total = ordered.length;
  return ordered.map((learning, index) => ({
    ...learning,
    ordinal: total - index,
  }));
}

export function getAllLearnings(): Learning[] {
  // Caching in development would hide newly written lessons until restart.
  if (process.env.NODE_ENV === "development") return readAllLearnings();
  cachedLearnings ??= readAllLearnings();
  return cachedLearnings;
}

export function getLearningBySlug(slug: string): Learning | undefined {
  return getAllLearnings().find((learning) => learning.slug === slug);
}

export function getAllSlugs(): string[] {
  return getAllLearnings().map((learning) => learning.slug);
}

export interface Facet {
  label: string;
  slug: string;
  count: number;
}

function tally(values: Iterable<string>): Facet[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const key = toSlug(value);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label: value, count: 1 });
  }
  return [...counts.entries()]
    .map(([slug, { label, count }]) => ({ slug, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const getTopics = (): Facet[] =>
  tally(getAllLearnings().flatMap((learning) => learning.topics));

export const getConcepts = (): Facet[] =>
  tally(getAllLearnings().flatMap((learning) => learning.concepts));

export const getLanguages = (): Facet[] =>
  tally(getAllLearnings().map((learning) => learning.language));

export const getProjects = (): Facet[] =>
  tally(getAllLearnings().map((learning) => learning.sourceProject));

export const getLearningsByTopic = (topicSlug: string): Learning[] =>
  getAllLearnings().filter((learning) =>
    learning.topics.some((topic) => toSlug(topic) === topicSlug),
  );

export const getLearningsByProject = (projectSlug: string): Learning[] =>
  getAllLearnings().filter(
    (learning) => toSlug(learning.sourceProject) === projectSlug,
  );

export function findFacetLabel(facets: Facet[], slug: string): string | undefined {
  return facets.find((facet) => facet.slug === slug)?.label;
}

export interface LearningStats {
  totalLessons: number;
  totalMinutes: number;
  topicCount: number;
  languageCount: number;
  projectCount: number;
  /** Consecutive daily lessons ending at the most recent lesson. */
  currentStreak: number;
  longestStreak: number;
  firstPublishedAt: string | null;
  latestPublishedAt: string | null;
}

const DAY_MS = 86_400_000;
const toUtcDay = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;

/**
 * Streaks are measured against the newest lesson rather than "today" so a
 * statically built page never silently goes stale between deployments.
 */
function computeStreaks(sortedDescending: Learning[]): {
  current: number;
  longest: number;
} {
  const days = [...new Set(sortedDescending.map((l) => toUtcDay(l.publishedAt)))].sort(
    (a, b) => b - a,
  );
  if (days.length === 0) return { current: 0, longest: 0 };

  // The current streak is the unbroken run containing the newest lesson, so it
  // ends at the first gap walking backwards from the top.
  let current = 1;
  while (current < days.length && days[current - 1] - days[current] === 1) {
    current += 1;
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i - 1] - days[i] === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest };
}

export function getStats(): LearningStats {
  const learnings = getAllLearnings();
  const { current, longest } = computeStreaks(learnings);

  return {
    totalLessons: learnings.length,
    totalMinutes: learnings.reduce((sum, l) => sum + l.estimatedMinutes, 0),
    topicCount: getTopics().length,
    languageCount: getLanguages().length,
    projectCount: getProjects().length,
    currentStreak: current,
    longestStreak: longest,
    firstPublishedAt: learnings.at(-1)?.publishedAt ?? null,
    latestPublishedAt: learnings.at(0)?.publishedAt ?? null,
  };
}

/**
 * Related lessons, best match first: explicit `relatedSlugs` win, then shared
 * concepts, then shared topics, then the same language.
 */
export function getRelatedLearnings(learning: Learning, limit = 3): Learning[] {
  // Deduplicated and self-excluded: a repeated or self-referential entry in
  // relatedSlugs would otherwise render twice and collide on its React key.
  const explicit = [...new Set(learning.relatedSlugs)]
    .filter((slug) => slug !== learning.slug)
    .map((slug) => getLearningBySlug(slug))
    .filter((related): related is Learning => Boolean(related));

  const conceptKeys = new Set(learning.concepts.map(toSlug));
  const topicKeys = new Set(learning.topics.map(toSlug));
  const taken = new Set([learning.slug, ...explicit.map((l) => l.slug)]);

  const scored = getAllLearnings()
    .filter((candidate) => !taken.has(candidate.slug))
    .map((candidate) => {
      const concepts = candidate.concepts.filter((c) => conceptKeys.has(toSlug(c))).length;
      const topics = candidate.topics.filter((t) => topicKeys.has(toSlug(t))).length;
      const language = candidate.language === learning.language ? 1 : 0;
      return { candidate, score: concepts * 3 + topics * 2 + language };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.publishedAt.localeCompare(a.candidate.publishedAt),
    )
    .map(({ candidate }) => candidate);

  return [...explicit, ...scored].slice(0, limit);
}

/**
 * Surfaces an older lesson worth revisiting — the oldest one the reader has had
 * the longest to forget. Deterministic, so the static build stays stable.
 */
export function getSuggestedRevision(excludeSlug?: string): Learning | null {
  const candidates = getAllLearnings().filter((l) => l.slug !== excludeSlug);
  if (candidates.length <= 1) return null;
  return candidates.at(-1) ?? null;
}

export function formatPublishedDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
