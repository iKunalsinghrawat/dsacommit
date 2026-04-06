import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";

import { AppShell } from "@/components/layout/app-shell";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        headline: user.headline,
        accessGrants: user.accessGrants,
      }}
    >
      {children}
    </AppShell>
  );
}
