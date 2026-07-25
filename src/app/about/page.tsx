import type { Metadata } from "next";

import { PageHeading } from "@/components/lesson-list";
import { PageShell } from "@/components/page-shell";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Daily Learnings picks a concept each day, and the rules that keep private work private.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell aside={null}>
      <PageHeading
        eyebrow="About"
        title="Why this exists"
        description="I ship features faster than I understand them. This is the correction."
      />

      <div className="lesson-prose max-w-[34rem]">
        <p>
          Working across several codebases, it is easy to implement something
          that works without ever learning why it works. The architectural
          decision gets made, the types line up, the tests pass — and the
          understanding never arrives. That gap compounds quietly.
        </p>

        <h2>How a lesson gets picked</h2>
        <p>
          Once a day, a job on my own machine reads the recent Git activity
          across my local repositories: what changed, what is still uncommitted,
          and what the surrounding code actually does. A diff alone is never
          enough context, so it reads the modules around the change too.
        </p>
        <p>
          From that it picks <em>one</em> concept — ranked on architectural
          weight, how reusable it is, and how likely I am to have leaned on
          autocomplete instead of learning it. Volume of changed lines is
          explicitly not a factor. On a quiet day it takes a foundational pattern
          from a module that has not been covered yet and says plainly that it is
          an exploration rather than a recent change.
        </p>

        <h2>What never leaves the machine</h2>
        <p>
          The repositories behind these lessons are private and may contain
          client work. This site is public. Those two facts set every rule that
          follows.
        </p>
        <ul>
          <li>
            Source repositories are strictly read-only. The job inspects them and
            never writes, stages, commits or checks anything out. Their state is
            recorded before analysis and verified afterwards; if anything moved,
            publishing aborts.
          </li>
          <li>
            Snippets are rewritten, not copied. Every example here is a
            standalone illustration using neutral names — Project, Customer,
            Record, Quote — built to teach the principle rather than to reproduce
            the original.
          </li>
          <li>
            An automated scan runs over the staged content before every commit,
            looking for absolute paths, credentials, tokens, connection strings,
            private URLs and other identifying details. A hit blocks the commit.
          </li>
        </ul>
        <p>
          If a concept cannot be explained without exposing something, it does
          not get published. There is always another concept.
        </p>

        <h2>How the site is built</h2>
        <p>
          Lessons are MDX files in a Git repository. There is no database, no CMS
          and no backend — Git already provides history, review and rollback for
          content that is written once a day and rarely edited. Every page is
          generated at build time, so what reaches the browser is static HTML
          with syntax highlighting already applied.
        </p>
        <p>
          The whole thing is{" "}
          <a href={siteConfig.repository} target="_blank" rel="noreferrer noopener">
            open on GitHub
          </a>{" "}
          — including the generator and the sanitisation rules.
        </p>
      </div>
    </PageShell>
  );
}
