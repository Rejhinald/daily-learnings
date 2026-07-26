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

  // --- Everyday building blocks -------------------------------------------
  // These are the words a lesson uses in passing and assumes you know. They
  // are here so that assumption is never load-bearing.
  "try/catch": {
    term: "try / catch",
    category: "JavaScript",
    definition:
      "A way to say \"attempt this, and if it blows up, run that instead\". The try block holds the risky work; the catch block receives the error. What you do inside catch is a real decision, not a formality.",
  },
  "throw": {
    term: "throw",
    category: "JavaScript",
    definition:
      "Deliberately raising an error to stop what you are doing. It travels up until something catches it, or it crashes the operation.",
  },
  "exception": {
    term: "Exception",
    category: "JavaScript",
    definition:
      "The error object produced when something goes wrong. It carries a message and a trail of where it happened.",
  },
  "middleware": {
    term: "Middleware",
    category: "Web",
    definition:
      "Code that sits between the incoming request and the code that answers it. It can inspect the request, block it, or wave it through. Logging, rate limits and permission checks usually live here.",
  },
  "async": {
    term: "async",
    category: "JavaScript",
    definition:
      "Marks a function as one that may need to wait for something — a network call, a file read — without freezing the rest of the program.",
  },
  "await": {
    term: "await",
    category: "JavaScript",
    definition:
      "Pauses inside an async function until the thing you are waiting for finishes, then continues with the result. It makes waiting read like ordinary top-to-bottom code.",
  },
  "promise": {
    term: "Promise",
    category: "JavaScript",
    definition:
      "A placeholder for a value that is not ready yet. It either settles with the value or with an error, and await is how you unwrap it.",
  },
  "null": {
    term: "null",
    category: "JavaScript",
    definition:
      "A deliberate \"there is nothing here\". Distinct from undefined, which usually means nobody ever put anything here in the first place.",
  },
  "undefined": {
    term: "undefined",
    category: "JavaScript",
    definition:
      "What you get when you ask for something that was never set. Reading a property that does not exist gives you this rather than an error.",
  },
  "token": {
    term: "Token",
    category: "Web",
    definition:
      "A string that proves who you are, sent with a request instead of a password. Anyone holding it is treated as you, which is why they are short-lived and never logged.",
  },
  "header": {
    term: "Header",
    category: "Web",
    definition:
      "A labelled line of metadata attached to a request or response — who is asking, what format they want, what token they carry. Separate from the body, which holds the actual data.",
  },
  "status code": {
    term: "Status code",
    category: "Web",
    definition:
      "The three-digit number a response leads with, summarising what happened. 2xx worked, 4xx means the caller got it wrong, 5xx means the server did.",
  },
  "401": {
    term: "401 Unauthorized",
    category: "Web",
    definition:
      "The status meaning \"I do not know who you are\". The caller needs to log in or send a valid token.",
  },
  "403": {
    term: "403 Forbidden",
    category: "Web",
    definition:
      "The status meaning \"I know who you are, and you are not allowed\". Different from 401, where the problem is identity rather than permission.",
  },
  "rate limit": {
    term: "Rate limit",
    category: "Web",
    definition:
      "A cap on how often someone may call you, so one caller cannot swamp the service. Usually counted per user or per address over a window of time.",
  },
  "environment variable": {
    term: "Environment variable",
    category: "Practice",
    definition:
      "A setting handed to your program by the machine it runs on, rather than written in the code. It is how secrets and per-environment differences stay out of the repository.",
  },
  "fail open": {
    term: "Fail open",
    category: "Practice",
    definition:
      "When a check cannot run, let the request through. Keeps things available, at the cost of the protection the check was providing.",
  },
  "fail closed": {
    term: "Fail closed",
    category: "Practice",
    definition:
      "When a check cannot run, refuse the request. Preserves the protection, at the cost of turning a broken check into an outage.",
  },
  "guard": {
    term: "Guard",
    category: "Practice",
    definition:
      "Any check that runs before the real work and decides whether it happens at all — a login check, a rate limit, a feature flag.",
  },
  "edge case": {
    term: "Edge case",
    category: "Practice",
    definition:
      "The unusual input nobody pictured while writing the happy path — empty lists, missing fields, the very first run, two things arriving at once.",
  },
  "regression": {
    term: "Regression",
    category: "Practice",
    definition:
      "Something that used to work and now does not, usually broken as a side effect of an unrelated change.",
  },
  "refactor": {
    term: "Refactor",
    category: "Practice",
    definition:
      "Changing the shape of code without changing what it does, usually to make the next change easier.",
  },
  "dependency": {
    term: "Dependency",
    category: "Practice",
    definition:
      "Someone else's code your project relies on. Convenient, and also a thing that can change under you.",
  },
  "build": {
    term: "Build",
    category: "Practice",
    definition:
      "The step that turns the code you wrote into the files that actually get served — compiling, bundling and generating pages ahead of time.",
  },
  "cache": {
    term: "Cache",
    category: "Practice",
    definition:
      "A saved copy of an answer, kept so you do not have to work it out again. Fast, and wrong the moment the real answer changes without the copy knowing.",
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
