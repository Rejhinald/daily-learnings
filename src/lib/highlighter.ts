// Hard guarantee that Shiki and its grammars never reach a client bundle: this
// import is a build error if anything in the client graph pulls the module in.
import "server-only";

import { createHighlighter, type Highlighter } from "shiki";

/**
 * Syntax highlighting happens once, at build time, on the server. Shiki never
 * reaches the browser: the pages ship pre-coloured HTML, which is why code is
 * readable before any JavaScript loads.
 */

export const CODE_THEMES = {
  light: "vitesse-light",
  dark: "vitesse-dark",
} as const;

/** Languages a lesson might realistically need. Anything else renders as text. */
const LANGUAGES = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "bash",
  "shell",
  "sql",
  "python",
  "css",
  "html",
  "yaml",
  "markdown",
  "diff",
  "go",
  "rust",
  "php",
  "prisma",
] as const;

const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  zsh: "bash",
  shellscript: "bash",
  yml: "yaml",
  md: "markdown",
  mdx: "markdown",
  golang: "go",
  py: "python",
  postgres: "sql",
  postgresql: "sql",
};

const SUPPORTED = new Set<string>(LANGUAGES);

/** Normalises a fence's language tag onto something Shiki has loaded. */
export function resolveLanguage(language: string | undefined): string {
  if (!language) return "text";
  const normalised = language.toLowerCase().trim();
  const resolved = ALIASES[normalised] ?? normalised;
  return SUPPORTED.has(resolved) ? resolved : "text";
}

// A single highlighter instance is reused across every page of the build;
// creating one per code block would load the grammars again each time.
let highlighterPromise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [CODE_THEMES.light, CODE_THEMES.dark],
    langs: [...LANGUAGES],
  });
  return highlighterPromise;
}

/**
 * Renders code to HTML carrying *both* themes at once. Each token gets a
 * `--shiki-light` and `--shiki-dark` custom property, so switching theme is a
 * CSS class change with no re-render and no flash of the wrong palette.
 */
export async function highlight(code: string, language?: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code.replace(/\s+$/, ""), {
    lang: resolveLanguage(language),
    themes: CODE_THEMES,
    defaultColor: false,
  });
}
