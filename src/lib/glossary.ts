/**
 * The tech dictionary.
 *
 * Any lesson can wrap a word in `<Term>` and the plain-English meaning appears
 * inline, without the reader leaving the sentence. Definitions live here rather
 * than in the lessons so the same word is always explained the same way, and so
 * the glossary grows into something worth reading on its own.
 *
 * House style for a definition:
 *   - plain English first, jargon second (or not at all)
 *   - say what it *does*, not what category it belongs to
 *   - one or two sentences; if it needs three, it wants its own lesson
 */

export interface GlossaryEntry {
  /** The headword, as it appears on the glossary page. */
  term: string;
  /** Plain-English meaning. Rendered as-is, so no markdown. */
  definition: string;
  /** Loose grouping for the glossary page. */
  category: "TypeScript" | "JavaScript" | "Web" | "Practice" | "React";
}

/** Keys are lowercase so `<Term>` lookups are case-insensitive. */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  "type annotation": {
    term: "Type annotation",
    category: "TypeScript",
    definition:
      "The label you write on a variable saying what kind of value it holds. It helps your editor and the compiler catch mistakes while you write, and it is removed before the code runs.",
  },
  "compile": {
    term: "Compile",
    category: "TypeScript",
    definition:
      "Translating the code you wrote into the code that actually runs. TypeScript compiles to plain JavaScript, and everything type-related is stripped out on the way.",
  },
  "runtime": {
    term: "Runtime",
    category: "JavaScript",
    definition:
      "When your program is actually running, as opposed to when you are writing or compiling it. A 'runtime check' is one that happens with real data, on a real request.",
  },
  "type erasure": {
    term: "Type erasure",
    category: "TypeScript",
    definition:
      "The fact that every type disappears when TypeScript is compiled to JavaScript. It is why an annotation can never protect you from unexpected data.",
  },
  "type assertion": {
    term: "Type assertion",
    category: "TypeScript",
    definition:
      "Writing \"as SomeType\" to tell the compiler to treat a value as that type. It silences the error and generates no code, so it is a claim rather than a check.",
  },
  "any": {
    term: "any",
    category: "TypeScript",
    definition:
      "TypeScript's \"stop checking this\" switch. Convenient, but it spreads: anything an any value touches also stops being checked.",
  },
  "unknown": {
    term: "unknown",
    category: "TypeScript",
    definition:
      "Like any, but honest. It means \"I do not know what this is yet\", and the compiler will not let you use the value until you check it.",
  },
  "schema": {
    term: "Schema",
    category: "Practice",
    definition:
      "A description of what shape some data should have, written as something that actually runs so it can inspect real values and tell you whether they match.",
  },
  "parse": {
    term: "Parse",
    category: "Practice",
    definition:
      "Take input you do not trust, check it, and hand back a value you do trust. The opposite of asserting, where you just declare the input is fine.",
  },
  "validation": {
    term: "Validation",
    category: "Practice",
    definition:
      "Checking that incoming data is what you expect before acting on it. Usually returns a yes or no; parsing goes further and gives you the checked value back.",
  },
  "trust boundary": {
    term: "Trust boundary",
    category: "Practice",
    definition:
      "The line where data you control meets data you do not. Request bodies, uploaded files, webhooks and saved state all cross one. It is where checks belong.",
  },
  "endpoint": {
    term: "Endpoint",
    category: "Web",
    definition:
      "A single URL your server answers, together with the code that answers it. A request goes in, a response comes out.",
  },
  "request body": {
    term: "Request body",
    category: "Web",
    definition:
      "The data a client sends along with a request, usually JSON. You did not create it, so you cannot assume anything about its shape.",
  },
  "json": {
    term: "JSON",
    category: "Web",
    definition:
      "A plain-text format for sending structured data between programs. It only supports a few kinds of value, which is why things like NaN cannot survive a round trip.",
  },
  "nan": {
    term: "NaN",
    category: "JavaScript",
    definition:
      "Short for 'not a number'. What JavaScript gives you instead of an error when a calculation makes no sense. It spreads through every sum it touches, and turns into null in JSON.",
  },
  "200 ok": {
    term: "200 OK",
    category: "Web",
    definition:
      "The HTTP status meaning the request succeeded. Returning it alongside a wrong answer is what makes some bugs so hard to notice.",
  },
  "400": {
    term: "400 Bad Request",
    category: "Web",
    definition:
      "The HTTP status meaning the caller sent something invalid. The right answer to malformed input, as opposed to a 500, which blames your server.",
  },
  "500": {
    term: "500 Internal Server Error",
    category: "Web",
    definition:
      "The HTTP status meaning your server broke. Using it for bad user input hides real failures and points the blame in the wrong direction.",
  },
  "silent failure": {
    term: "Silent failure",
    category: "Practice",
    definition:
      "When something goes wrong and nothing says so. No crash, no log, no alert — just a quietly incorrect result that can survive in production for months.",
  },
  "serializer": {
    term: "Serializer",
    category: "Practice",
    definition:
      "The code that turns objects into a format that can be sent or stored, like JSON. If it changes what it emits, everything reading the other end can break.",
  },
  "union type": {
    term: "Union type",
    category: "TypeScript",
    definition:
      "A type that says \"one of these\". Written with a bar between the options, meaning the value must be exactly one of them and nothing else.",
  },
  "narrowing": {
    term: "Narrowing",
    category: "TypeScript",
    definition:
      "When the compiler works out which of the possible types you are actually holding, because of a check you did. Return early on the bad case and it knows the rest of the function has the good one.",
  },
  "compiler": {
    term: "Compiler",
    category: "TypeScript",
    definition:
      "The tool that reads your TypeScript, complains about mistakes, and produces the JavaScript that actually runs.",
  },
  "server component": {
    term: "Server Component",
    category: "React",
    definition:
      "A React component that runs only on the server, during the build or the request. Its code never reaches the browser, so it can read files and use secrets.",
  },
  "client component": {
    term: "Client Component",
    category: "React",
    definition:
      "A React component that ships to the browser so it can respond to clicks, typing and other interaction. Everything in it becomes JavaScript the visitor downloads.",
  },
};

export const GLOSSARY_KEYS = Object.keys(GLOSSARY);

/** Looks a term up case-insensitively. Returns undefined when it is unknown. */
export function lookupTerm(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key.trim().toLowerCase()];
}

export function glossaryByCategory(): Array<{
  category: GlossaryEntry["category"];
  entries: GlossaryEntry[];
}> {
  const groups = new Map<GlossaryEntry["category"], GlossaryEntry[]>();
  for (const entry of Object.values(GLOSSARY)) {
    const existing = groups.get(entry.category);
    if (existing) existing.push(entry);
    else groups.set(entry.category, [entry]);
  }
  return [...groups.entries()]
    .map(([category, entries]) => ({
      category,
      entries: entries.sort((a, b) => a.term.localeCompare(b.term)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
