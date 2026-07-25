import { isValidElement } from "react";

import { lookupTerm } from "@/lib/glossary";

/**
 * An inline jargon word with its meaning attached.
 *
 * The point is that you never have to leave the sentence to find out what a
 * word means. Hover it, tap it, or tab to it and the plain-English definition
 * appears in place.
 *
 * It ships **no JavaScript**: the panel is shown by CSS on `:hover` and
 * `:focus-within`. A tap on a touch device focuses the button, which is what
 * makes it work on phones without a click handler.
 *
 * Usage in MDX:
 *   <Term>type erasure</Term>              looks the word up as written
 *   <Term of="type erasure">peeled off</Term>   different display text
 */

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

export function Term({
  children,
  of,
}: {
  children: React.ReactNode;
  /** Glossary key, when it differs from the visible text. */
  of?: string;
}) {
  const entry = lookupTerm(of ?? textOf(children));

  // An unknown key renders as ordinary text rather than breaking the sentence.
  // `bun run validate:content` fails the build on these, so it cannot ship.
  if (!entry) return <>{children}</>;

  return (
    <span className="dl-term">
      <button type="button" className="dl-term-trigger">
        {children}
        {/*
          The definition is part of the button's accessible name, so screen
          readers get it without needing an id to point at — which keeps the
          markup safe when the same word appears twice on a page.
        */}
        <span className="sr-only">{`: ${entry.term}. ${entry.definition}`}</span>
      </button>
      <span className="dl-term-panel" aria-hidden>
        <span className="dl-term-head">{entry.term}</span>
        <span className="dl-term-def">{entry.definition}</span>
      </span>
    </span>
  );
}
