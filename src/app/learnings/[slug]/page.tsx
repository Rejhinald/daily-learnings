import { ArrowLeft, Clock, Compass, Folder } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DifficultyBadge, MetaItem, TopicChip } from "@/components/concept-badge";
import { LessonAside } from "@/components/lesson-aside";
import { PageShell } from "@/components/page-shell";
import {
  formatPublishedDate,
  getAllSlugs,
  getLearningBySlug,
  getRelatedLearnings,
} from "@/lib/learnings";
import { absoluteUrl, siteConfig } from "@/lib/site";

interface LessonPageProps {
  // Route params are asynchronous in the current App Router.
  params: Promise<{ slug: string }>;
}

/** Every lesson is prerendered; unknown slugs 404 instead of rendering on demand. */
export function generateStaticParams(): { slug: string }[] {
  return getAllSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const learning = getLearningBySlug(slug);
  if (!learning) return {};

  const url = absoluteUrl(`/learnings/${learning.slug}`);

  return {
    title: learning.title,
    description: learning.summary,
    keywords: [...learning.topics, ...learning.concepts],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: learning.title,
      description: learning.summary,
      publishedTime: learning.publishedAt,
      tags: learning.topics,
    },
    twitter: {
      card: "summary_large_image",
      title: learning.title,
      description: learning.summary,
    },
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;
  const learning = getLearningBySlug(slug);
  if (!learning) notFound();

  const related = getRelatedLearnings(learning);

  // Lesson bodies live outside the route tree, so they are pulled in by path.
  // The filename is fully determined by validated frontmatter.
  const { default: LessonBody } = await import(
    `../../../content/learnings/${learning.publishedAt}-${learning.slug}.mdx`
  );

  const isExploration = learning.originKind === "codebase-exploration";

  return (
    <PageShell aside={<LessonAside learning={learning} related={related} />}>
      <article>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All lessons
        </Link>

        <header className="mt-4 border-b border-line pb-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ink-muted">
            <span className="font-medium text-accent">
              Lesson {learning.ordinal.toString().padStart(3, "0")}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={learning.publishedAt}>
              {formatPublishedDate(learning.publishedAt)}
            </time>
            {isExploration && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Compass className="size-3" aria-hidden />
                  Codebase exploration
                </span>
              </>
            )}
          </div>

          <h1 className="mt-3 max-w-[34rem] font-serif text-[1.875rem] font-semibold leading-[1.2] tracking-[-0.015em] text-ink sm:text-[2.125rem]">
            {learning.title}
          </h1>

          <p className="mt-3 max-w-[34rem] text-[1.0625rem] leading-relaxed text-ink-secondary">
            {learning.summary}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[0.8125rem]">
            <DifficultyBadge difficulty={learning.difficulty} />
            <MetaItem icon={Folder} label="Source">
              {learning.sourceProject}
            </MetaItem>
            <MetaItem icon={Clock} label="Reading time">
              {learning.estimatedMinutes} min read
            </MetaItem>
            <span className="text-ink-secondary">{learning.language}</span>
          </div>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {learning.topics.map((topic) => (
              <li key={topic}>
                <TopicChip label={topic} />
              </li>
            ))}
          </ul>
        </header>

        <div className="lesson-prose mt-7">
          <LessonBody />
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="mt-10 border-t border-line pt-6 xl:hidden"
        >
          <h2
            id="related-heading"
            className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-muted"
          >
            Related lessons
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/learnings/${item.slug}`}
                  className="block rounded-inner border border-line bg-card px-3.5 py-3 transition-colors hover:border-line-strong"
                >
                  <span className="font-serif text-[0.9375rem] font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink-secondary">
                    {item.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Structured data so the lesson is legible to search engines as an article. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: learning.title,
            description: learning.summary,
            datePublished: learning.publishedAt,
            inLanguage: siteConfig.locale,
            author: { "@type": "Person", name: siteConfig.author },
            keywords: [...learning.topics, ...learning.concepts].join(", "),
            url: absoluteUrl(`/learnings/${learning.slug}`),
            isPartOf: { "@type": "Blog", name: siteConfig.name, url: siteConfig.url },
          }),
        }}
      />
    </PageShell>
  );
}
