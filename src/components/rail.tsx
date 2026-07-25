import { cn } from "@/lib/utils";

/**
 * Shared shell for the sidebar blocks.
 *
 * Rails must never out-weigh the feed, so they sit on the page background with
 * a single hairline instead of the card surface and shadow used by lessons.
 */
export function RailSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-card/60 p-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A label/value row, used for the statistics blocks. */
export function RailStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[0.8125rem] text-ink-secondary">{label}</span>
      <span className="font-mono text-[0.8125rem] font-medium text-ink" title={hint}>
        {value}
      </span>
    </div>
  );
}
