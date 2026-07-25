import { CopyButton } from "@/components/copy-button";
import { highlight, resolveLanguage } from "@/lib/highlighter";
import { cn } from "@/lib/utils";

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  tsx: "TSX",
  javascript: "JavaScript",
  jsx: "JSX",
  json: "JSON",
  bash: "Shell",
  sql: "SQL",
  python: "Python",
  css: "CSS",
  html: "HTML",
  yaml: "YAML",
  markdown: "Markdown",
  diff: "Diff",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  prisma: "Prisma",
  text: "Text",
};

export interface CodeBlockProps {
  code: string;
  language?: string;
  /** Shown in the header instead of the language name. */
  filename?: string;
  showLineNumbers?: boolean;
  /** Renders a chrome-less block for tight spaces such as feed cards. */
  compact?: boolean;
  /** Number of lines cut from the end, shown so the preview never looks whole. */
  hiddenLines?: number;
  className?: string;
}

/**
 * An async Server Component: highlighting runs during the build and the browser
 * receives finished HTML.
 */
export async function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
  compact = false,
  hiddenLines = 0,
  className,
}: CodeBlockProps) {
  const trimmed = code.replace(/\s+$/, "");
  const resolved = resolveLanguage(language);
  const html = await highlight(trimmed, language);
  const label = filename ?? LANGUAGE_LABELS[resolved] ?? resolved;

  return (
    <figure
      className={cn(
        "group not-prose overflow-hidden rounded-[0.5rem] border border-line bg-code",
        className,
      )}
    >
      <figcaption
        className={cn(
          "flex items-center justify-between gap-3 border-b border-line bg-subtle/60 pl-3 pr-1.5",
          compact ? "py-1" : "py-1.5",
        )}
      >
        <span className="truncate font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </span>
        <CopyButton value={trimmed} className={compact ? "size-6" : undefined} />
      </figcaption>
      <div
        className={cn(
          // The block scrolls inside its own container so the page never does.
          "overflow-x-auto",
          compact ? "px-3 py-2.5" : "px-4 py-3.5",
        )}
      >
        <div
          className={showLineNumbers ? "shiki-numbered" : undefined}
          // Markup is produced by Shiki from our own MDX content at build time.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {hiddenLines > 0 && (
        <p className="border-t border-line bg-subtle/40 px-3 py-1 font-mono text-[0.6875rem] text-ink-muted">
          + {hiddenLines} more {hiddenLines === 1 ? "line" : "lines"}
        </p>
      )}
    </figure>
  );
}
