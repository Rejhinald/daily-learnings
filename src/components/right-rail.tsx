import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ConceptBadge } from "@/components/concept-badge";
import { RailSection, RailStat } from "@/components/rail";
import {
  getAllLearnings,
  getLanguages,
  getStats,
  getSuggestedRevision,
  getTopics,
} from "@/lib/learnings";

/**
 * Right rail: everything derived from the lesson collection itself. No counters
 * are invented — each number is computed from the MDX files at build time.
 */
export function RightRail({ excludeSlug }: { excludeSlug?: string }) {
  const stats = getStats();
  const topics = getTopics().slice(0, 6);
  const languages = getLanguages().slice(0, 5);
  const revision = getSuggestedRevision(excludeSlug);

  // "Recently covered" means the concepts from the newest lessons, in order.
  const recentConcepts = [
    ...new Set(getAllLearnings().slice(0, 4).flatMap((learning) => learning.concepts)),
  ].slice(0, 10);

  const busiestTopic = topics[0]?.count ?? 1;

  return (
    <div className="sticky top-[4.5rem] space-y-4">
      <RailSection title="Progress">
        <div className="divide-y divide-line">
          <RailStat label="Lessons" value={stats.totalLessons} />
          <RailStat
            label="Reading time"
            value={formatTotalMinutes(stats.totalMinutes)}
            hint="Sum of the estimated reading time of every lesson"
          />
          <RailStat label="Topics" value={stats.topicCount} />
          <RailStat label="Languages" value={stats.languageCount} />
          <RailStat
            label="Longest streak"
            value={`${stats.longestStreak}d`}
            hint="Longest run of consecutive daily lessons"
          />
        </div>
      </RailSection>

      {recentConcepts.length > 0 && (
        <RailSection title="Recently covered">
          <ul className="flex flex-wrap gap-1.5">
            {recentConcepts.map((concept) => (
              <li key={concept}>
                <ConceptBadge>{concept}</ConceptBadge>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {topics.length > 0 && (
        <RailSection
          title="Topics"
          action={
            <Link
              href="/topics"
              className="font-mono text-[0.6875rem] text-accent hover:text-accent-hover"
            >
              All
            </Link>
          }
        >
          <ul className="space-y-1.5">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={`/topics/${topic.slug}`}
                  className="group block rounded-[0.3rem] px-1 py-0.5 hover:bg-subtle"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.8125rem] text-ink-secondary group-hover:text-ink">
                      {topic.label}
                    </span>
                    <span className="font-mono text-[0.75rem] text-ink-muted">
                      {topic.count}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 block h-[2px] rounded-full bg-accent/25"
                    style={{ width: `${Math.round((topic.count / busiestTopic) * 100)}%` }}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {languages.length > 0 && (
        <RailSection title="Languages">
          <ul className="space-y-0.5">
            {languages.map((language) => (
              <li
                key={language.slug}
                className="flex items-baseline justify-between gap-2 py-0.5"
              >
                <span className="truncate text-[0.8125rem] text-ink-secondary">
                  {language.label}
                </span>
                <span className="font-mono text-[0.75rem] text-ink-muted">
                  {language.count}
                </span>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {revision && (
        <RailSection title="Worth revisiting">
          <Link href={`/learnings/${revision.slug}`} className="group block">
            <p className="font-serif text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-accent">
              {revision.title}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-secondary">
              {revision.summary}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-accent">
              Lesson {revision.ordinal.toString().padStart(3, "0")}
              <ArrowUpRight className="size-3" aria-hidden />
            </span>
          </Link>
        </RailSection>
      )}
    </div>
  );
}

function formatTotalMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
