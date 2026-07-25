import Link from "next/link";

import type { LearningFrontmatter } from "@/lib/learning-schema";
import { toSlug } from "@/lib/learnings";
import { cn } from "@/lib/utils";

/**
 * The small labels used across the feed.
 *
 * Every one carries its meaning in text, never in colour alone — colour only
 * reinforces what the label already says.
 */

const chipBase =
  "inline-flex items-center gap-1 rounded-chip border px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium leading-5 tracking-[0.01em]";

export function ConceptBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        chipBase,
        "border-line bg-subtle text-ink-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TopicChip({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      href={`/topics/${toSlug(label)}`}
      className={cn(
        chipBase,
        "border-accent-border bg-accent-soft text-accent transition-colors hover:border-accent hover:bg-accent-soft/70",
        className,
      )}
    >
      {label}
    </Link>
  );
}

const DIFFICULTY_STYLES: Record<LearningFrontmatter["difficulty"], string> = {
  beginner: "border-success/30 bg-success-soft text-success",
  intermediate: "border-accent-border bg-accent-soft text-accent",
  advanced: "border-warn/30 bg-warn-soft text-warn",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: LearningFrontmatter["difficulty"];
  className?: string;
}) {
  return (
    <span className={cn(chipBase, DIFFICULTY_STYLES[difficulty], className)}>
      {difficulty}
    </span>
  );
}

/** A single piece of card metadata: an icon plus its value. */
export function MetaItem({
  icon: Icon,
  children,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  /** Screen-reader context, because the icon alone does not explain the number. */
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}
