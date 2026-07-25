/**
 * Sanitisation guardrails for published lesson content.
 *
 * Daily Learnings is a public repository generated from private client
 * repositories, so every lesson passes through this scanner before it can be
 * committed. The rules below are deliberately generic: a committed denylist of
 * real client names would itself publish those names. Machine-local terms are
 * loaded separately from a gitignored file (see `automation/.private-denylist.txt`).
 *
 * Bias throughout: this is a gate that makes a human look, not a classifier.
 * A false positive costs one edit; a false negative publishes client code.
 */

export type Severity = "block" | "warn";

export interface SafetyRule {
  id: string;
  description: string;
  severity: Severity;
  pattern: RegExp;
  /** Matches that are known-safe and should not be reported. */
  allow?: RegExp;
}

export interface SafetyFinding {
  ruleId: string;
  description: string;
  severity: Severity;
  line: number;
  column: number;
  excerpt: string;
}

export interface ScanOptions {
  /** Extra machine-local terms (client names, internal project codenames). */
  extraTerms?: string[];
  /** Rule ids to skip, for files that legitimately need them (e.g. README). */
  skipRules?: string[];
  /** Only run the secret-detection rules. Used for non-content staged files. */
  secretsOnly?: boolean;
}

/**
 * Hosts that are safe to mention in a teaching context. Anything else that
 * looks like a URL gets flagged for a human to confirm.
 */
const PUBLIC_HOSTS = [
  "localhost",
  "example.com",
  "example.org",
  "example.net",
  "github.com",
  "nextjs.org",
  "react.dev",
  "vercel.com",
  "developer.mozilla.org",
  "typescriptlang.org",
  "tailwindcss.com",
  "ui.shadcn.com",
  "zod.dev",
  "shiki.style",
  "bun.sh",
  "npmjs.com",
  "schema.org",
  "w3.org",
  "lucide.dev",
  "mdxjs.com",
];

/**
 * Environment variables that are framework-standard and reveal nothing about
 * private infrastructure. Anything else named in a lesson is suspicious.
 */
const PUBLIC_ENV_VARS = [
  "NODE_ENV",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_URL",
  "VERCEL_ENV",
  "PORT",
  "CI",
  "TZ",
];

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hostAlternatives = PUBLIC_HOSTS.map(escapeRegExp).join("|");
const envAlternatives = PUBLIC_ENV_VARS.map(escapeRegExp).join("|");

/** A public host at the very start of an authority, optionally with a port. */
const publicHostAllow = (prefix: string): RegExp =>
  new RegExp(`^${prefix}(?:[a-z0-9-]+\\.)*(?:${hostAlternatives})(?::\\d+)?(?:[/?#]|$)`, "i");

export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "absolute-windows-path",
    description:
      "Absolute Windows path - reveals the local machine layout and username",
    severity: "block",
    // Any drive-letter path with at least one complete segment. Not an
    // enumerated list of directory names: those only catch the paths you
    // thought of. The lookbehind keeps "https://" from matching as "s:/".
    pattern: /(?<![A-Za-z0-9])[A-Za-z]:[\\/](?:[^\s"'`<>|:*?\n]+[\\/])+[^\s"'`<>|:*?\n]*/g,
  },
  {
    id: "absolute-unix-home",
    description: "Absolute POSIX home or WSL path - reveals the local username",
    severity: "block",
    // No trailing slash required: "/home/deploy" leaks the username on its own.
    pattern: /(?:\/mnt\/[a-z]\/[Uu]sers|\/home|\/Users)\/[^\s/"'`<>|\n]+/g,
  },
  {
    id: "private-key-block",
    description: "PEM private key block",
    severity: "block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    id: "provider-token",
    description: "Credential that matches a known provider token format",
    severity: "block",
    // Prefixes are split so this file never matches its own source text.
    pattern: new RegExp(
      [
        "gh[pousr]_[A-Za-z0-9]{16,}",
        "github" + "_pat_[A-Za-z0-9_]{20,}",
        // Covers legacy sk-<random> as well as sk-proj-, sk-ant-api03-, sk-or-v1-.
        "(?<![A-Za-z0-9_-])sk-(?:[A-Za-z0-9]{1,12}-){0,3}[A-Za-z0-9]{20,}",
        "sk" + "_live_[A-Za-z0-9]{16,}",
        "pk" + "_live_[A-Za-z0-9]{16,}",
        "xox[bpasr]-[A-Za-z0-9-]{10,}",
        "AKIA[0-9A-Z]{16}",
        "AIza[0-9A-Za-z_-]{30,}",
        "glpat-[A-Za-z0-9_-]{16,}",
      ].join("|"),
      "g",
    ),
  },
  {
    id: "secret-assignment",
    description: "Secret-looking value assigned to a credential-named key",
    severity: "block",
    // Catches the credential classes with no fixed prefix (AWS secret access
    // keys, generic `apiKey = "..."`). The leading [A-Za-z0-9_]* is what makes
    // AWS_SECRET_ACCESS_KEY match, since `_` is a word character.
    pattern:
      /[A-Za-z0-9_]*(?:api[_-]?key|secret|access[_-]?token|auth[_-]?token|password)[A-Za-z0-9_]*["'`]?\s*[:=]\s*["'`][^"'`\s]{16,}["'`]/gi,
  },
  {
    id: "jwt",
    description: "JSON Web Token",
    severity: "block",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    id: "bearer-token",
    description: "Hard-coded bearer or authorization token value",
    severity: "block",
    pattern: /\b(?:Bearer|Authorization:\s*Bearer)\s+[A-Za-z0-9._-]{16,}/gi,
  },
  {
    id: "database-connection-string",
    description: "Database or cache connection string",
    severity: "block",
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s"'`)]+/gi,
  },
  {
    id: "commit-hash",
    description:
      "Raw 40-character commit hash - not publishable from a private repository",
    severity: "block",
    pattern: /\b[0-9a-f]{40}\b/gi,
  },
  {
    id: "email-address",
    description: "Email address",
    severity: "block",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    allow: /@(?:example\.(?:com|org|net)|users\.noreply\.github\.com)$/i,
  },
  {
    id: "phone-number",
    description: "Possible phone number",
    severity: "block",
    pattern: /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
  },
  {
    id: "public-ip-address",
    description: "IP address that is not from a documentation or private range",
    severity: "block",
    pattern: /\b(?!0\.|10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)(?:\d{1,3}\.){3}\d{1,3}\b/g,
    // RFC 5737 reserves these ranges precisely so documentation can use them.
    allow: /^(?:192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)\d{1,3}$/,
  },
  {
    id: "private-url",
    description: "URL pointing at a host that is not a known public reference",
    severity: "block",
    pattern: /\bhttps?:\/\/[^\s"'`)<>\]]+/gi,
    // The host must sit immediately after "//", so a public name smuggled into
    // the userinfo segment (https://github.com@internal.host/) is not allowed.
    allow: publicHostAllow("https?://"),
  },
  {
    id: "schemeless-host-path",
    description:
      "Hostname with a path but no scheme - may be a private service reference",
    severity: "block",
    // Lowercase-only on purpose: it keeps prose like "React.Component/..." out
    // while still catching real hostnames, which are conventionally lowercase.
    pattern: /\b(?:[a-z0-9-]+\.)+[a-z]{2,24}\/[^\s"'`)<>\]]+/g,
    allow: publicHostAllow(""),
  },
  {
    id: "private-env-var",
    description:
      "Environment variable name that may reveal private infrastructure - use an allow-listed name or a generic placeholder",
    // Blocking, not warning: the daily job runs unattended, so a warning would
    // be nobody's job to read and the name would ship. The spec lists private
    // environment variable names under "never publish".
    severity: "block",
    pattern: /\bprocess\.env\.[A-Z][A-Z0-9_]{2,}/g,
    allow: new RegExp(`^process\\.env\\.(?:${envAlternatives})$`),
  },
  {
    id: "long-numeric-id",
    description: "Long numeric identifier - possible account or internal ID",
    severity: "warn",
    pattern: /\b\d{12,}\b/g,
  },
];

/** Rules that must run even on non-content files during the pre-commit scan. */
const SECRET_RULE_IDS = new Set([
  "private-key-block",
  "provider-token",
  "secret-assignment",
  "jwt",
  "bearer-token",
  "database-connection-string",
  "absolute-windows-path",
  "absolute-unix-home",
]);

const SEPARATORS = /[\s._-]+/g;

/**
 * The denylist terms that will actually be enforced.
 *
 * Exported so the loaders and the rule builder cannot disagree about which
 * entries count — a term silently dropped here is a client name that ships.
 */
export function usableDenylistTerms(terms: string[]): string[] {
  return terms
    .map((term) => term.trim())
    .filter((term) => !term.startsWith("#") && term.replace(SEPARATORS, "").length >= 3);
}

/**
 * Client names reach a snippet glued into an identifier far more often than as
 * a bare word (`acmeCorpClient`, `ACME_CORP_TOKEN`, `NorthwindInvoiceRow`), and
 * a word boundary produces no match there. So the term is matched as a
 * substring, and tolerates separators inside it.
 */
const flexibleTerm = (term: string): string =>
  term
    .replace(SEPARATORS, "")
    .split("")
    .map(escapeRegExp)
    .join("[\\s._-]*");

function buildLocalTermRule(terms: string[]): SafetyRule | null {
  const cleaned = usableDenylistTerms(terms);
  if (cleaned.length === 0) return null;
  return {
    id: "local-denylist-term",
    description:
      "Matches a machine-local denylist term (client or internal project name)",
    severity: "block",
    pattern: new RegExp(`(?:${cleaned.map(flexibleTerm).join("|")})`, "gi"),
  };
}

/**
 * Scans text and returns every rule violation with its position.
 *
 * Returns findings rather than throwing so callers can decide whether a `warn`
 * is acceptable in their context.
 */
export function scanText(text: string, options: ScanOptions = {}): SafetyFinding[] {
  const { extraTerms = [], skipRules = [], secretsOnly = false } = options;

  const localRule = buildLocalTermRule(extraTerms);
  const rules = [...SAFETY_RULES, ...(localRule ? [localRule] : [])].filter(
    (rule) => {
      if (skipRules.includes(rule.id)) return false;
      if (secretsOnly) {
        return SECRET_RULE_IDS.has(rule.id) || rule.id === "local-denylist-term";
      }
      return true;
    },
  );

  const lines = text.split(/\r?\n/);
  const findings: SafetyFinding[] = [];

  for (const rule of rules) {
    lines.forEach((line, index) => {
      // Rules carry the global flag, so reset state between lines.
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(line)) !== null) {
        // Guard against a zero-length match looping forever.
        if (match[0].length === 0) {
          rule.pattern.lastIndex += 1;
          continue;
        }
        const value = match[0];
        if (rule.allow?.test(value)) continue;
        findings.push({
          ruleId: rule.id,
          description: rule.description,
          severity: rule.severity,
          line: index + 1,
          column: match.index + 1,
          excerpt: redact(value),
        });
      }
    });
  }

  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

/** Truncates a match so the scanner's own output never republishes a secret. */
export function redact(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} chars)`;
}

export const hasBlockingFinding = (findings: SafetyFinding[]): boolean =>
  findings.some((finding) => finding.severity === "block");
