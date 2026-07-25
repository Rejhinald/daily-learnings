import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[87.5rem] flex-col gap-3 px-4 py-6 text-[0.8125rem] text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-md leading-relaxed">
          Lessons are written from my own work and sanitised before publishing —
          generalised examples only, never client code.
        </p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/rss.xml" className="hover:text-ink">
            RSS
          </Link>
          <a
            href={siteConfig.repository}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-ink"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
