import { Rss } from "lucide-react";
import Link from "next/link";

import { GithubMark } from "@/components/github-mark";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/lib/site";

/**
 * The header is deliberately thin. On wide screens the wordmark sits directly
 * above the left rail so the two read as a single column of chrome.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[87.5rem] items-center gap-3 px-4 sm:px-6">
        <MobileNav />

        <Link
          href="/"
          className="shrink-0 lg:w-[13.5rem]"
          aria-label={`${siteConfig.name} — home`}
        >
          <span className="whitespace-nowrap font-serif text-[1rem] font-semibold tracking-[-0.01em] text-ink sm:text-[1.0625rem]">
            Daily Learnings
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {/* A plain anchor: rss.xml is a static file, not a route the
              client-side router knows how to navigate to. */}
          <a
            href="/rss.xml"
            className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            aria-label="RSS feed"
            title="RSS feed"
          >
            <Rss className="size-4" aria-hidden />
          </a>
          <a
            href={siteConfig.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Source on GitHub"
            title="Source on GitHub"
          >
            <GithubMark className="size-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
