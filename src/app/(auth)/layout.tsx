import type { ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="page-shell py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
      </div>
      {children}
    </div>
  );
}
