"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

/**
 * Returns false while rendering on the server and true once hydrated, without
 * an effect and without the extra render an effect-plus-setState would cause.
 */
const noopSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * A three-way segmented control rather than a toggle, so "follow my system"
 * stays reachable instead of being lost the first time you pick a theme.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The server cannot know the stored theme, so the active state is only
  // rendered after hydration to avoid a mismatch.
  const hydrated = useHydrated();

  return (
    // A group of toggle buttons rather than a radiogroup: radiogroup semantics
    // oblige roving tabindex and arrow-key navigation, and a control this small
    // is better served by three plainly-labelled toggles that are each tabbable.
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-line bg-subtle p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-[0.3rem] transition-colors",
              active
                ? "bg-card text-ink shadow-card"
                : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
