"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme state is the one genuinely global piece of client state on the site, so
 * it gets a provider and nothing else does.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
