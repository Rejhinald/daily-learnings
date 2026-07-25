/**
 * Writes public/rss.xml from the lesson files.
 *
 * The feed is produced at build time rather than served by a route handler, so
 * the site stays entirely static — no backend, no API routes, nothing to keep
 * running.
 *
 *   bun run scripts/generate-feed.ts
 */
import fs from "node:fs";
import path from "node:path";

import { getAllLearnings } from "../src/lib/learnings";
import { absoluteUrl, siteConfig } from "../src/lib/site";

const OUTPUT = path.join(process.cwd(), "public", "rss.xml");

/** Escapes the five characters that are not legal as XML text. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS requires RFC 822 dates; lessons store plain calendar days. */
function toRfc822(isoDate: string): string {
  return new Date(`${isoDate}T09:00:00Z`).toUTCString();
}

function buildFeed(): string {
  const learnings = getAllLearnings();
  const lastBuild = learnings[0]?.publishedAt;

  const items = learnings
    .map((learning) => {
      const url = absoluteUrl(`/learnings/${learning.slug}`);
      return `    <item>
      <title>${escapeXml(learning.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${toRfc822(learning.publishedAt)}</pubDate>
      <description>${escapeXml(learning.summary)}</description>
${learning.topics.map((topic) => `      <category>${escapeXml(topic)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(siteConfig.url)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en-us</language>
${lastBuild ? `    <lastBuildDate>${toRfc822(lastBuild)}</lastBuildDate>\n` : ""}    <atom:link href="${escapeXml(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

try {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, buildFeed(), "utf8");
  console.log(`✓ wrote ${path.relative(process.cwd(), OUTPUT)}`);
} catch (error) {
  console.error("✗ failed to generate the RSS feed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
