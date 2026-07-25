import type { Metadata } from "next";

import { FacetIndex } from "@/components/facet-index";
import { PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { getTopics } from "@/lib/learnings";

export const metadata: Metadata = {
  title: "Topics",
  description: "Every subject covered so far, and how often each has come up.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  const topics = getTopics();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Index"
        title="Topics"
        description="What the lessons have covered so far. The counts are computed from the lesson files themselves, so they only grow when something real is published."
      />
      <FacetIndex
        facets={topics}
        basePath="/topics"
        emptyMessage="No topics yet — they appear as lessons are published."
      />
    </PageShell>
  );
}
