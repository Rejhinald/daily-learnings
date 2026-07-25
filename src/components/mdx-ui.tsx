import { TriangleAlert, Lightbulb, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The components a lesson can use inside MDX.
 *
 * They exist so lesson files stay close to plain prose: an author writes
 * `<Callout>` rather than hand-rolling markup, and every lesson looks the same
 * without anyone styling MDX file by file.
 */

const CALLOUT_VARIANTS = {
  note: {
    Icon: StickyNote,
    label: "Note",
    className: "border-line bg-subtle/60",
    iconClass: "text-ink-muted",
  },
  insight: {
    Icon: Lightbulb,
    label: "Worth noticing",
    className: "border-accent-border bg-accent-soft/60",
    iconClass: "text-accent",
  },
  warning: {
    Icon: TriangleAlert,
    label: "Careful",
    className: "border-warn/30 bg-warn-soft/60",
    iconClass: "text-warn",
  },
} as const;

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof CALLOUT_VARIANTS;
  title?: string;
  children: React.ReactNode;
}) {
  const { Icon, label, className, iconClass } = CALLOUT_VARIANTS[type];

  return (
    <aside
      className={cn(
        "not-prose my-5 rounded-inner border px-4 py-3.5 font-sans text-[0.9375rem] leading-relaxed text-ink-secondary",
        className,
      )}
    >
      <p className="mb-1.5 flex items-center gap-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink">
        <Icon className={cn("size-3.5", iconClass)} aria-hidden />
        {title ?? label}
      </p>
      <div className="space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}

/** A text diagram of data or control flow. */
export function Flow({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-5">
      <pre className="diagram">{children}</pre>
    </div>
  );
}

/**
 * Knowledge check. The answers use a native `<details>` element, so they stay
 * collapsible without shipping a byte of JavaScript.
 */
export function Quiz({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-6 rounded-card border border-line bg-card p-4 sm:p-5">
      <p className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
        Knowledge check
      </p>
      <ol className="space-y-3">{children}</ol>
    </div>
  );
}

export function Question({
  q,
  children,
}: {
  /** The question, shown as the always-visible prompt. */
  q: string;
  /** The answer, revealed on click. */
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-inner border border-line bg-page">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2.5 px-3.5 py-3 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-accent transition-transform group-open:scale-150"
          />
          <span className="flex-1">{q}</span>
          <span className="mt-0.5 shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted group-open:hidden">
            Show
          </span>
        </summary>
        <div className="border-t border-line px-3.5 py-3 font-sans text-[0.9375rem] leading-relaxed text-ink-secondary [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {children}
        </div>
      </details>
    </li>
  );
}

/** The closing principle of a lesson. */
export function Takeaway({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose my-6 rounded-card border border-line border-l-2 border-l-accent bg-card px-4 py-4 sm:px-5">
      <p className="mb-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
        Takeaway
      </p>
      <div className="font-serif text-[1.0625rem] leading-relaxed text-ink [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </aside>
  );
}
