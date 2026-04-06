"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "border border-border/80 bg-card-strong text-foreground",
        }}
      />
    </ThemeProvider>
  );
}
