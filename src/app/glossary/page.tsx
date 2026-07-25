import type { Metadata } from "next";

import { PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { glossaryByCategory, GLOSSARY_KEYS } from "@/lib/glossary";
import { toSlug } from "@/lib/learnings";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Plain-English meanings for the jargon that shows up in the lessons. No circular definitions.",
  alternates: { canonical: "/glossary" },
};

export default function GlossaryPage() {
  const groups = glossaryByCategory();

  return (
    <PageShell aside={null}>
      <PageHeading
        eyebrow={`${GLOSSARY_KEYS.length} terms`}
        title="Glossary"
        description="Every jargon word the lessons use, explained without using more jargon to do it. These are the same definitions that appear when you hover a dotted word inside a lesson."
      />

      <div className="space-y-8">
        {groups.map(({ category, entries }) => (
          <section key={category} aria-labelledby={`cat-${toSlug(category)}`}>
            <h2
              id={`cat-${toSlug(category)}`}
              className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted"
            >
              {category}
            </h2>
            <dl className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.term}
                  id={toSlug(entry.term)}
                  className="scroll-mt-24 rounded-card border border-line bg-card px-4 py-3.5"
                >
                  <dt className="font-serif text-[1.0625rem] font-semibold text-ink">
                    {entry.term}
                  </dt>
                  <dd className="mt-1 max-w-[36rem] text-[0.9375rem] leading-relaxed text-ink-secondary">
                    {entry.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
