import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth";
import { UserPortal } from "@/generated/prisma/enums";
import { getCommunicationShellState } from "@/server/communication-service";

import { AppShell } from "@/components/layout/app-shell";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const communicationShellState = user.accessGrants.includes(UserPortal.MESSAGES)
    ? await getCommunicationShellState(user.id)
    : { unreadNotificationCount: 0, incomingCall: null };

  return (
    <AppShell
      initialIncomingCall={communicationShellState.incomingCall}
      initialUnreadNotificationCount={communicationShellState.unreadNotificationCount}
      user={{
        id: user.id,
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
