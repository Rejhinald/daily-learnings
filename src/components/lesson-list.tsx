import { LearningCard } from "@/components/learning-card";
import type { Learning } from "@/lib/learning-schema";

/** A plain chronological list of lesson cards, used by the facet pages. */
export function LessonList({ learnings }: { learnings: Learning[] }) {
  return (
    <ul className="space-y-3">
      {learnings.map((learning) => (
        <li key={learning.slug}>
          <LearningCard learning={learning} />
        </li>
      ))}
    </ul>
  );
}

/** The heading block shared by the facet and index pages. */
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="mb-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-[1.5rem] font-semibold tracking-[-0.01em] text-ink sm:text-[1.75rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-ink-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
