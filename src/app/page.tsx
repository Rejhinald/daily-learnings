import { LearningCard } from "@/components/learning-card";
import { LearningFeed, type FeedItem } from "@/components/learning-feed";
import { PageShell } from "@/components/page-shell";
import type { Learning } from "@/lib/learning-schema";
import { getAllLearnings, getStats } from "@/lib/learnings";

/**
 * The feed.
 *
 * Cards are rendered here on the server — highlighting included — and handed to
 * the client feed purely so it can filter them.
 */

/**
 * Everything a lesson can be searched by. The body is capped: the opening of a
 * lesson is the part worth matching, and shipping every full lesson to the
 * browser would grow the page by a few kilobytes a day forever.
 */
const BODY_SEARCH_CHARS = 800;

function buildHaystack(learning: Learning): string {
  return [
    learning.title,
    learning.summary,
    learning.language,
    learning.sourceProject,
    learning.difficulty,
    ...learning.topics,
    ...learning.concepts,
    learning.preview?.code ?? "",
    learning.body.slice(0, BODY_SEARCH_CHARS),
  ]
    .join(" ")
    .toLowerCase();
}

export default function HomePage() {
  const learnings = getAllLearnings();
  const stats = getStats();

  const items: FeedItem[] = learnings.map((learning, index) => ({
    slug: learning.slug,
    haystack: buildHaystack(learning),
    language: learning.language,
    difficulty: learning.difficulty,
    card: <LearningCard learning={learning} featured={index === 0} />,
  }));

  return (
    <PageShell>
      <div className="mb-5">
        <h1 className="font-serif text-[1.5rem] font-semibold tracking-[-0.01em] text-ink sm:text-[1.75rem]">
          One concept a day, taken from real production code
        </h1>
        <p className="mt-1.5 max-w-[38rem] text-[0.9375rem] leading-relaxed text-ink-secondary">
          Every evening, one decision from my own repositories gets pulled apart
          and explained from first principles — generalised, never copied.
        </p>
      </div>

      {learnings.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          <LearningFeed items={items} />
          <p className="mt-6 text-center font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
            {stats.totalLessons} published · next lesson lands tomorrow
          </p>
        </>
      )}
    </PageShell>
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-card px-6 py-14 text-center">
      <h2 className="font-serif text-xl text-ink">No lessons yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-ink-secondary">
        The generator publishes one lesson per day. Run it manually with{" "}
        <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[0.8125rem]">
          bun run daily
        </code>{" "}
        to create the first one.
      </p>
    </div>
  );
}
