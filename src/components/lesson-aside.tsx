import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { RailSection } from "@/components/rail";
import type { Learning } from "@/lib/learning-schema";

/**
 * The lesson-page rail: where you are in this lesson, and where to go next.
 * The statistics rail is deliberately absent here — while reading, progress
 * counters are noise.
 */
export function LessonAside({
  learning,
  related,
}: {
  learning: Learning;
  related: Learning[];
}) {
  return (
    <div className="sticky top-[4.5rem] space-y-4">
      {learning.headings.length > 1 && (
        <RailSection title="On this page">
          <nav aria-label="Lesson sections">
            <ol className="space-y-1">
              {learning.headings.map((heading, index) => (
                <li key={heading.id} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[0.15rem] w-4 shrink-0 text-right font-mono text-[0.6875rem] text-ink-muted"
                  >
                    {index + 1}
                  </span>
                  <Link
                    href={`#${heading.id}`}
                    className="text-[0.8125rem] leading-snug text-ink-secondary hover:text-accent"
                  >
                    {heading.text}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </RailSection>
      )}

      {related.length > 0 && (
        <RailSection title="Related lessons">
          <ul className="space-y-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/learnings/${item.slug}`} className="group block">
                  <p className="font-serif text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-accent">
                    {item.title}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
                    Lesson {item.ordinal.toString().padStart(3, "0")}
                    <ArrowUpRight className="size-3" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </RailSection>
      )}
    </div>
  );
}
