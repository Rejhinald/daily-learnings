import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonList, PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { findFacetLabel, getLearningsByTopic, getTopics } from "@/lib/learnings";

interface TopicPageProps {
  params: Promise<{ topic: string }>;
}

export function generateStaticParams(): { topic: string }[] {
  return getTopics().map((topic) => ({ topic: topic.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic } = await params;
  const label = findFacetLabel(getTopics(), topic);
  if (!label) return {};

  return {
    title: label,
    description: `Lessons covering ${label}.`,
    alternates: { canonical: `/topics/${topic}` },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topic } = await params;
  const label = findFacetLabel(getTopics(), topic);
  if (!label) notFound();

  const learnings = getLearningsByTopic(topic);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Topic"
        title={label}
        description={`${learnings.length} ${
          learnings.length === 1 ? "lesson" : "lessons"
        } covering ${label}.`}
      />
      <LessonList learnings={learnings} />
    </PageShell>
  );
}
