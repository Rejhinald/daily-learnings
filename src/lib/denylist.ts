import fs from "node:fs";
import path from "node:path";

import { usableDenylistTerms } from "@/lib/source-safety";

/**
 * Loads the machine-local list of client and project names that must never be
 * published.
 *
 * The file is gitignored on purpose: committing a list of client names to a
 * public repository would publish exactly what the list exists to protect.
 *
 * This loader **fails closed**. Previously a missing file meant the
 * client-name rule silently did nothing while the gates still reported
 * success — the most dangerous possible failure mode for a tool whose whole
 * job is stopping client names from reaching a public repo.
 */

export const DENYLIST_PATH = path.join(
  process.cwd(),
  "automation",
  ".private-denylist.txt",
);

const EXAMPLE_PATH = path.join(
  process.cwd(),
  "automation",
  ".private-denylist.example.txt",
);

const OVERRIDE = "ALLOW_MISSING_DENYLIST";

export interface DenylistResult {
  terms: string[];
  /** True when the list is absent but the override permitted the run anyway. */
  bypassed: boolean;
}

function readLines(file: string): string[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

/**
 * Returns the usable denylist terms, or throws with an actionable message.
 * Set ALLOW_MISSING_DENYLIST=1 to proceed without one (for a clone that has no
 * private repositories to protect).
 */
export function loadDenylist(): DenylistResult {
  const raw = readLines(DENYLIST_PATH);
  const terms = usableDenylistTerms(raw);

  // An unedited copy of the example is not protection.
  const isUnedited =
    fs.existsSync(DENYLIST_PATH) &&
    fs.existsSync(EXAMPLE_PATH) &&
    fs.readFileSync(DENYLIST_PATH, "utf8").trim() ===
      fs.readFileSync(EXAMPLE_PATH, "utf8").trim();

  if (terms.length === 0 || isUnedited) {
    if (process.env[OVERRIDE] === "1") {
      return { terms: [], bypassed: true };
    }
    const reason = isUnedited
      ? "is an unedited copy of the example file"
      : "is missing or contains no usable terms (three characters or more)";
    throw new Error(
      `automation/.private-denylist.txt ${reason}.\n` +
        "  The client-name rule would be silently disabled, so this gate fails closed.\n" +
        "  Copy automation/.private-denylist.example.txt and add your terms, or set\n" +
        `  ${OVERRIDE}=1 if you genuinely have no private repositories to protect.`,
    );
  }

  // Terms dropped for being too short are reported rather than silently lost.
  const dropped = raw
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !terms.includes(line));

  if (dropped.length > 0) {
    console.warn(
      `! Ignored ${dropped.length} denylist entr${
        dropped.length === 1 ? "y" : "ies"
      } shorter than three characters.`,
    );
  }

  return { terms, bypassed: false };
}
