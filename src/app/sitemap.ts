import type { MetadataRoute } from "next";

import { getAllLearnings, getProjects, getTopics } from "@/lib/learnings";
import { absoluteUrl } from "@/lib/site";

// The sitemap is generated once at build time, like every other page.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const learnings = getAllLearnings();
  const latest = learnings[0]?.publishedAt;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: latest,
      changeFrequency: "daily",
      priority: 1,
    },
    { url: absoluteUrl("/topics"), lastModified: latest, priority: 0.6 },
    { url: absoluteUrl("/projects"), lastModified: latest, priority: 0.6 },
    { url: absoluteUrl("/about"), priority: 0.4 },
  ];

  return [
    ...staticRoutes,
    ...learnings.map((learning) => ({
      url: absoluteUrl(`/learnings/${learning.slug}`),
      lastModified: learning.publishedAt,
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
    ...getTopics().map((topic) => ({
      url: absoluteUrl(`/topics/${topic.slug}`),
      lastModified: latest,
      priority: 0.5,
    })),
    ...getProjects().map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: latest,
      priority: 0.5,
    })),
  ];
}
