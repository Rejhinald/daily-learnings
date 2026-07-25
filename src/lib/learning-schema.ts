import { z } from "zod";

/**
 * The contract every lesson's frontmatter must satisfy.
 *
 * This is the only definition of what a valid lesson is. The build reads it,
 * `bun run validate:content` reads it, and the daily automation reads it — so a
 * malformed lesson fails loudly at authoring time instead of rendering a broken
 * page in production.
 */

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRealCalendarDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

/**
 * Whether the lesson came from code that actually changed recently, or from
 * reading an existing module. The distinction is published on the lesson so a
 * quiet week is never dressed up as new work.
 */
export const ORIGIN_KINDS = ["recent-change", "codebase-exploration"] as const;

export const learningFrontmatterSchema = z.object({
  title: z.string().min(8).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(KEBAB_CASE, "slug must be kebab-case (a-z, 0-9 and single hyphens)"),
  publishedAt: z
    .string()
    .refine(isRealCalendarDate, "publishedAt must be a real YYYY-MM-DD date"),
  summary: z.string().min(40).max(400),
  /**
   * A generalised label such as "Internal scheduling dashboard". Never a client
   * name, repository name, or anything that identifies the source of the work.
   */
  sourceProject: z.string().min(3).max(80),
  language: z.string().min(1).max(40),
  difficulty: z.enum(DIFFICULTIES),
  estimatedMinutes: z.number().int().min(1).max(60),
  topics: z.array(z.string().min(2).max(40)).min(1).max(6),
  /** The feed renders these as tags; the spec asks for two to five. */
  concepts: z.array(z.string().min(2).max(48)).min(2).max(5),
  originKind: z.enum(ORIGIN_KINDS).default("recent-change"),
  /**
   * Deterministic hash over sanitised signals only (generalised project label,
   * module category, symbol category, teaching topic). It exists to stop the
   * automation teaching the same thing twice and must never encode a real path.
   */
  sourceFingerprint: z.string().min(8).max(128).optional(),
  /** Slugs of earlier lessons this one builds on. Validated against disk later. */
  relatedSlugs: z.array(z.string().regex(KEBAB_CASE)).max(5).default([]),
});

export type LearningFrontmatter = z.infer<typeof learningFrontmatterSchema>;

/** A validated lesson plus the derived data the UI needs. */
export interface Learning extends LearningFrontmatter {
  /**
   * Position in the published sequence, oldest first and 1-based. Lessons are
   * genuinely ordinal — one per day — so the number is real information rather
   * than decoration, and the UI leans on it as the lesson's short identity.
   */
  ordinal: number;
  /** Raw MDX body with frontmatter stripped. Used for search and previews. */
  body: string;
  /** First fenced code block in the body, trimmed for the feed card preview. */
  preview: CodePreview | null;
  /** `##` headings, used for the on-page lesson outline. */
  headings: LessonHeading[];
  readingMinutes: number;
}

export interface CodePreview {
  language: string;
  code: string;
  /** Lines cut from the end of the block, so the card can say how many. */
  hiddenLines: number;
}

export interface LessonHeading {
  id: string;
  text: string;
}

/** Formats Zod issues into something a human can act on in a terminal. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}
