"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { isActivePath, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Navigation for screens too narrow for the left rail. It is a Client Component
 * because it holds open/closed state; the rail itself stays on the server.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    // Focus moves into the panel so keyboard users are not stranded behind it.
    panelRef.current?.focus();

    // Captured now: by the time cleanup runs the ref may point somewhere else.
    const trigger = triggerRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Return focus to the button that opened it, so closing the menu does not
      // dump the caret back at the top of the document.
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-subtle hover:text-ink"
      >
        {open ? <X className="size-4.5" aria-hidden /> : <Menu className="size-4.5" aria-hidden />}
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-30 cursor-default bg-page/60"
          />
          <div
            id="mobile-nav-panel"
            ref={panelRef}
            tabIndex={-1}
            className="fixed inset-x-0 top-14 z-40 border-b border-line bg-card shadow-raised focus:outline-none"
          >
            <nav aria-label="Main" className="mx-auto max-w-[87.5rem] px-3 py-2">
              <ul>
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = isActivePath(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        // Closed here rather than in an effect on the pathname:
                        // navigating is the only way to leave this panel, so
                        // the click is the event, not a render to react to.
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          // 44px tall: a comfortable touch target.
                          "flex h-11 items-center gap-3 rounded-inner px-3 text-[0.9375rem] transition-colors",
                          active
                            ? "bg-accent-soft font-medium text-accent"
                            : "text-ink-secondary hover:bg-subtle hover:text-ink",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
