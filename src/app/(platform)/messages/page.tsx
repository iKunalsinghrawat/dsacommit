import { UserPortal } from "@/generated/prisma/enums";
import { MessagesWorkspace } from "@/components/communication/messages-workspace";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import { getMessagesPageData } from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requirePortalAccess(UserPortal.MESSAGES);
  const user = await requireUser();
  const data = await getMessagesPageData(user.id, user.role);

  return (
    <MessagesWorkspace
      conversations={data.conversations}
      currentUserId={user.id}
      currentUserRole={user.role}
      notifications={data.notifications}
      quickStartUsers={data.quickStartUsers}
      unreadNotificationCount={data.unreadNotificationCount}
    />
  );
}
