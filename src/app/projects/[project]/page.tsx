import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonList, PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { findFacetLabel, getLearningsByProject, getProjects } from "@/lib/learnings";

interface ProjectPageProps {
  params: Promise<{ project: string }>;
}

export function generateStaticParams(): { project: string }[] {
  return getProjects().map((project) => ({ project: project.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { project } = await params;
  const label = findFacetLabel(getProjects(), project);
  if (!label) return {};

  return {
    title: label,
    description: `Lessons drawn from work on a ${label.toLowerCase()}.`,
    alternates: { canonical: `/projects/${project}` },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { project } = await params;
  const label = findFacetLabel(getProjects(), project);
  if (!label) notFound();

  const learnings = getLearningsByProject(project);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Project"
        title={label}
        description={`${learnings.length} ${
          learnings.length === 1 ? "lesson" : "lessons"
        } drawn from this kind of work.`}
      />
      <LessonList learnings={learnings} />
    </PageShell>
  );
}
