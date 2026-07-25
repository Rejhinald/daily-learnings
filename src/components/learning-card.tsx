import { ArrowRight, Clock, Compass, Folder } from "lucide-react";
import Link from "next/link";

import { CodeBlock } from "@/components/code-block";
import {
  ConceptBadge,
  DifficultyBadge,
  MetaItem,
} from "@/components/concept-badge";
import type { Learning } from "@/lib/learning-schema";
import { formatPublishedDate } from "@/lib/learnings";
import { cn } from "@/lib/utils";

const ordinalLabel = (ordinal: number): string =>
  ordinal.toString().padStart(3, "0");

/**
 * One lesson in the feed.
 *
 * The card is a preview, not a summary of a summary: it shows the ordinal, the
 * generalised source, why the topic matters, and a taste of the actual code, so
 * the decision to open it is informed.
 */
export function LearningCard({
  learning,
  featured = false,
}: {
  learning: Learning;
  featured?: boolean;
}) {
  const href = `/learnings/${learning.slug}`;
  const isExploration = learning.originKind === "codebase-exploration";

  return (
    <article
      className={cn(
        "relative rounded-card border border-line bg-card shadow-card transition-colors",
        "hover:border-line-strong",
        // The newest lesson gets the margin rail — the one place the accent
        // colour appears at any size.
        featured && "border-l-2 border-l-accent",
      )}
    >
      <div className="p-4 sm:p-5">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
          <span className="font-medium text-ink-secondary">
            Lesson {ordinalLabel(learning.ordinal)}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={learning.publishedAt}>
            {formatPublishedDate(learning.publishedAt)}
          </time>
          {featured && (
            <span className="rounded-chip bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
              Latest
            </span>
          )}
        </header>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-muted">
          <MetaItem icon={Folder} label="Source">
            {learning.sourceProject}
          </MetaItem>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="text-ink-secondary">{learning.language}</span>
          {isExploration && (
            <>
              <span aria-hidden className="text-line-strong">
                ·
              </span>
              <MetaItem icon={Compass} label="Origin">
                Codebase exploration
              </MetaItem>
            </>
          )}
        </div>

        <h2 className="mt-2.5 font-serif text-[1.3125rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={href} className="after:absolute after:inset-0 hover:text-accent">
            {learning.title}
          </Link>
        </h2>

        <p className="mt-2 max-w-[36rem] text-[0.9375rem] leading-relaxed text-ink-secondary">
          {learning.summary}
        </p>

        {learning.preview && (
          <CodeBlock
            code={learning.preview.code}
            language={learning.preview.language}
            hiddenLines={learning.preview.hiddenLines}
            compact
            // Lifted above the title's click overlay so the copy button works.
            className="relative z-[1] mt-3.5"
          />
        )}

        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {learning.concepts.map((concept) => (
            <li key={concept}>
              <ConceptBadge>{concept}</ConceptBadge>
            </li>
          ))}
        </ul>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
          <DifficultyBadge difficulty={learning.difficulty} />
          <MetaItem icon={Clock} label="Reading time">
            {learning.estimatedMinutes} min read
          </MetaItem>
        </div>
        <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent">
          Read lesson
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </footer>
    </article>
  );
}
