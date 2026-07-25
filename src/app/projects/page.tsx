import type { Metadata } from "next";

import { FacetIndex } from "@/components/facet-index";
import { PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { getProjects } from "@/lib/learnings";

export const metadata: Metadata = {
  title: "Projects",
  description: "The kinds of work the lessons are drawn from, described generically.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Index"
        title="Projects"
        description="Lessons grouped by the kind of application they came from. These labels are deliberately generic — the underlying repositories are private, and nothing here identifies a client or a codebase."
      />
      <FacetIndex
        facets={projects}
        basePath="/projects"
        emptyMessage="No projects yet — they appear as lessons are published."
      />
    </PageShell>
  );
}
