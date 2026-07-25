import { Flame } from "lucide-react";
import Link from "next/link";

import { RailNav } from "@/components/rail-nav";
import { getStats } from "@/lib/learnings";

/**
 * Left rail: navigation plus the one number that says whether the habit is
 * holding. Everything else lives on the right so the feed keeps the middle.
 */
export function LeftRail() {
  const stats = getStats();
  const streakDays = stats.currentStreak;

  return (
    <div className="sticky top-[4.5rem] space-y-4">
      <RailNav />

      <div className="rounded-card border border-line bg-card/60 p-3.5">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-success" aria-hidden />
          <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Streak
          </span>
        </div>
        <p className="mt-2 font-serif text-[1.75rem] font-semibold leading-none text-ink">
          {streakDays}
          <span className="ml-1.5 font-sans text-[0.8125rem] font-normal text-ink-secondary">
            {streakDays === 1 ? "day" : "days"}
          </span>
        </p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-secondary">
          {stats.totalLessons === 0
            ? "No lessons yet. The first one publishes on the next run."
            : `${stats.totalLessons} ${
                stats.totalLessons === 1 ? "lesson" : "lessons"
              } published, ending ${stats.latestPublishedAt}.`}
        </p>
      </div>

      <div className="rounded-card border border-line bg-card/60 p-3.5">
        <p className="text-[0.8125rem] leading-relaxed text-ink-secondary">
          One concept a day, pulled from code I actually shipped — then explained
          from first principles.
        </p>
        <Link
          href="/about"
          className="mt-2 inline-block text-[0.8125rem] font-medium text-accent hover:text-accent-hover"
        >
          How this works
        </Link>
      </div>
    </div>
  );
}
