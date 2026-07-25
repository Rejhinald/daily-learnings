import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { isValidElement } from "react";

import { CodeBlock } from "@/components/code-block";
import { Callout, Flow, Question, Quiz, Takeaway } from "@/components/mdx-ui";
import { toSlug } from "@/lib/learnings";

/**
 * The MDX component map.
 *
 * Lesson files stay close to plain Markdown: typography, code blocks and
 * callouts are defined once here, so no lesson ever needs its own styling.
 */

/** Flattens MDX children into plain text for generating heading anchors. */
function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

function Heading({
  level,
  children,
}: {
  level: 2 | 3;
  children?: React.ReactNode;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  const id = toSlug(textOf(children));

  return (
    <Tag id={id}>
      {/*
        The anchor sits on the heading text itself rather than as a hovering
        link icon, so it works on touch as well as with a mouse.
      */}
      <a href={`#${id}`} className="group/anchor no-underline">
        <span className="group-hover/anchor:underline group-hover/anchor:decoration-line-strong group-hover/anchor:underline-offset-4">
          {children}
        </span>
        <span
          aria-hidden
          className="ml-2 select-none font-mono text-sm text-ink-muted opacity-0 transition-opacity group-hover/anchor:opacity-100"
        >
          #
        </span>
      </a>
    </Tag>
  );
}

// As of @next/mdx 16 this hook takes no arguments; the returned map is merged
// with the built-in element mapping by the compiler.
export function useMDXComponents(): MDXComponents {
  return {
    h2: ({ children }) => <Heading level={2}>{children}</Heading>,
    h3: ({ children }) => <Heading level={3}>{children}</Heading>,

    a: ({ href, children, ...props }) => {
      const target = href ?? "#";
      // Internal links go through the router; external ones open safely.
      if (target.startsWith("/")) {
        return (
          <Link href={target} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={target} target="_blank" rel="noreferrer noopener" {...props}>
          {children}
        </a>
      );
    },

    /*
     * MDX turns a fenced block into <pre><code class="language-x">. Blocks with
     * a language become highlighted CodeBlocks; blocks without one are treated
     * as text diagrams, which is how the flow illustrations are written.
     */
    pre: ({ children }) => {
      if (
        !isValidElement<{ className?: string; children?: React.ReactNode }>(children)
      ) {
        return <pre className="diagram">{children}</pre>;
      }

      const code = textOf(children.props.children).replace(/\n$/, "");
      const language = /language-([\w+#-]+)/.exec(children.props.className ?? "")?.[1];

      if (!language) return <pre className="diagram">{code}</pre>;

      return (
        <div className="my-5">
          <CodeBlock code={code} language={language} showLineNumbers />
        </div>
      );
    },

    // Prose bullets are drawn with a ::before, which needs list-style: none —
    // and that makes Safari/VoiceOver stop announcing the list. The explicit
    // role puts the semantics back.
    ul: ({ children, ...props }) => (
      <ul role="list" {...props}>
        {children}
      </ul>
    ),

    table: ({ children, ...props }) => (
      <div className="my-5 overflow-x-auto">
        <table {...props}>{children}</table>
      </div>
    ),

    // Available to every lesson without an import.
    Callout,
    Flow,
    Quiz,
    Question,
    Takeaway,
  };
}
