import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { Facet } from "@/lib/learnings";

/**
 * The index used by both /topics and /projects: a scannable list of facets with
 * how many lessons sit behind each.
 */
export function FacetIndex({
  facets,
  basePath,
  emptyMessage,
}: {
  facets: Facet[];
  basePath: string;
  emptyMessage: string;
}) {
  if (facets.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-card px-6 py-12 text-center">
        <p className="text-[0.9375rem] text-ink-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {facets.map((facet) => (
        <li key={facet.slug}>
          <Link
            href={`${basePath}/${facet.slug}`}
            className="group flex items-center justify-between gap-3 rounded-card border border-line bg-card px-3.5 py-3 transition-colors hover:border-line-strong"
          >
            <span className="min-w-0">
              <span className="block truncate text-[0.9375rem] font-medium text-ink group-hover:text-accent">
                {facet.label}
              </span>
              <span className="mt-0.5 block font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted">
                {facet.count} {facet.count === 1 ? "lesson" : "lessons"}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-ink-muted transition-colors group-hover:text-accent"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
