"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injects an inline <script> to set the theme class before
// hydration (avoids a flash of the wrong theme). It still executes correctly
// since it's part of the server-rendered HTML — React 19.2 just added a
// generic dev-only warning for any <script> tag a component renders, which is
// a false positive for this specific technique. Suppressed here rather than
// dropping next-themes over a cosmetic console warning.
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError(...args);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
