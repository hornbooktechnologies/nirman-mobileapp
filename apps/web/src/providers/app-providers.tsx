"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Design previews are intentionally isolated from session hydration, API
  // clients, persistent storage, and the production theme/provider tree.
  if (
    pathname === "/design-preview" ||
    pathname.startsWith("/design-preview/")
  ) {
    return children;
  }

  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
