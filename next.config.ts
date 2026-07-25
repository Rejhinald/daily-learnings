import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson bodies are `.mdx` files under src/content, imported by the [slug]
  // route. They are not routes themselves, so `pageExtensions` stays default.
  outputFileTracingIncludes: {
    "/learnings/[slug]": ["./src/content/learnings/**/*"],
  },
};

// Turbopack cannot serialise plugin functions across its worker boundary, so
// remark plugins are declared by name and resolved on the other side.
const withMDX = createMDX({
  options: {
    // Named, not imported: plugin functions cannot cross Turbopack's boundary.
    // No options object — remark-frontmatter reads `{}` as a matter definition
    // with no `type` and throws; omitting it defaults to YAML, which is what
    // the lessons use.
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
