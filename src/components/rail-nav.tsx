"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * The desktop rail navigation. Client-side only because marking the current
 * page requires the pathname.
 */
export function RailNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-inner px-2.5 text-[0.875rem] transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-secondary hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
