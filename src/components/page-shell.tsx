import { LeftRail } from "@/components/left-rail";
import { RightRail } from "@/components/right-rail";

/**
 * The three-column reading layout.
 *
 * Mobile is a single column. At `lg` the navigation rail appears; at `xl` the
 * right-hand rail joins it. Below `xl` the rail drops underneath the feed
 * rather than disappearing, because its contents are useful, not decorative.
 */
export function PageShell({
  children,
  excludeSlug,
  /** Replaces the default statistics rail. Pass `null` for a two-column page. */
  aside,
}: {
  children: React.ReactNode;
  excludeSlug?: string;
  aside?: React.ReactNode | null;
}) {
  const rail = aside === undefined ? <RightRail excludeSlug={excludeSlug} /> : aside;

  return (
    <div
      className={
        rail === null
          ? "mx-auto grid max-w-[87.5rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]"
          : "mx-auto grid max-w-[87.5rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)_18.5rem]"
      }
    >
      <aside className="hidden lg:col-start-1 lg:row-start-1 lg:block">
        <LeftRail />
      </aside>

      <div className="min-w-0 lg:col-start-2 lg:row-start-1">{children}</div>

      {rail !== null && (
        <aside className="lg:col-span-2 lg:col-start-1 xl:col-span-1 xl:col-start-3 xl:row-start-1">
          {rail}
        </aside>
      )}
    </div>
  );
}
