"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Everything searchable about one lesson, flattened on the server so the
 * browser never has to parse MDX.
 */
export interface FeedItem {
  slug: string;
  haystack: string;
  language: string;
  difficulty: string;
  /** The card, already rendered (and syntax-highlighted) on the server. */
  card: React.ReactNode;
}

const INITIAL_VISIBLE = 8;
const LOAD_MORE_STEP = 8;

/**
 * The feed is a Client Component only because filtering is interactive. The
 * cards inside it are Server Components handed over as props, so no lesson
 * content or highlighting logic ships to the browser.
 */
export function LearningFeed({ items }: { items: FeedItem[] }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const languages = useMemo(
    () => [...new Set(items.map((item) => item.language))].sort(),
    [items],
  );
  const difficulties = useMemo(
    () =>
      ["beginner", "intermediate", "advanced"].filter((level) =>
        items.some((item) => item.difficulty === level),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (language && item.language !== language) return false;
      if (difficulty && item.difficulty !== difficulty) return false;
      return terms.every((term) => item.haystack.includes(term));
    });
  }, [items, query, language, difficulty]);

  const hasFilters = query !== "" || language !== null || difficulty !== null;

  function clearFilters() {
    setQuery("");
    setLanguage(null);
    setDifficulty(null);
    setVisible(INITIAL_VISIBLE);
  }

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  return (
    <div>
      <div className="rounded-card border border-line bg-card p-3 shadow-card sm:p-3.5">
        <label htmlFor="lesson-search" className="sr-only">
          Search lessons
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            id="lesson-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(INITIAL_VISIBLE);
            }}
            placeholder="Search titles, concepts and code"
            // No outline-none here: the global :focus-visible ring is the only
            // keyboard affordance this input has.
            className="h-10 w-full rounded-inner border border-line bg-page pl-9 pr-3 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-accent"
          />
        </div>

        {(languages.length > 1 || difficulties.length > 1) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
              <SlidersHorizontal className="size-3" aria-hidden />
              Filter
            </span>

            {difficulties.length > 1 &&
              difficulties.map((level) => (
                <FilterChip
                  key={level}
                  active={difficulty === level}
                  onClick={() => {
                    setDifficulty(difficulty === level ? null : level);
                    setVisible(INITIAL_VISIBLE);
                  }}
                >
                  {level}
                </FilterChip>
              ))}

            {languages.length > 1 &&
              languages.map((item) => (
                <FilterChip
                  key={item}
                  active={language === item}
                  onClick={() => {
                    setLanguage(language === item ? null : item);
                    setVisible(INITIAL_VISIBLE);
                  }}
                >
                  {item}
                </FilterChip>
              ))}
          </div>
        )}
      </div>

      <div
        className="mt-3 flex items-center justify-between px-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted"
        aria-live="polite"
      >
        <span>
          {filtered.length} {filtered.length === 1 ? "lesson" : "lessons"}
          {hasFilters && ` of ${items.length}`}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
          >
            <X className="size-3" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {shown.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {shown.map((item) => (
            <li key={item.slug}>{item.card}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-card border border-dashed border-line-strong bg-card px-6 py-12 text-center">
          <p className="font-serif text-lg text-ink">No lesson matches that.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.9375rem] text-ink-secondary">
            Try a broader term, or clear the filters to see every lesson.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 inline-flex h-9 items-center rounded-inner border border-line bg-page px-3.5 text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong"
          >
            Clear filters
          </button>
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + LOAD_MORE_STEP)}
          className="mt-3 h-11 w-full rounded-card border border-line bg-card text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
        >
          Load {Math.min(remaining, LOAD_MORE_STEP)} more
        </button>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 rounded-chip border px-2 font-mono text-[0.6875rem] font-medium transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-page text-ink-secondary hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
