/**
 * Single source of truth for site identity.
 *
 * `NEXT_PUBLIC_SITE_URL` lets Vercel preview deployments generate correct
 * absolute URLs for metadata, the sitemap and the feed. It falls back to the
 * production URL so a plain `bun run build` needs no environment at all.
 */
export const siteConfig = {
  name: "Daily Learnings",
  tagline: "One concept a day, taken from real production code.",
  description:
    "A daily programming lesson drawn from my own recent development work — the fundamentals underneath the code I actually ship, explained one concept at a time.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://daily-learnings.vercel.app").replace(
    /\/$/,
    "",
  ),
  author: "Rejhinald",
  repository: "https://github.com/Rejhinald/daily-learnings",
  locale: "en-US",
} as const;

export const absoluteUrl = (pathname: string): string =>
  `${siteConfig.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
