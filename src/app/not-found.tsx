import Link from "next/link";

import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell aside={null}>
      <div className="rounded-card border border-line bg-card px-6 py-16 text-center">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
          404
        </p>
        <h1 className="mt-2 font-serif text-[1.75rem] font-semibold text-ink">
          That lesson does not exist
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-ink-secondary">
          The link may be from before a lesson was renamed, or the page may never
          have existed. The feed has everything that has been published.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-inner border border-accent-border bg-accent-soft px-4 text-[0.875rem] font-medium text-accent transition-colors hover:border-accent"
        >
          Back to the feed
        </Link>
      </div>
    </PageShell>
  );
}
