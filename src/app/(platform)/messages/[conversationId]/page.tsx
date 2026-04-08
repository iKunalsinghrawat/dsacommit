import { notFound } from "next/navigation";

import { UserPortal } from "@/generated/prisma/enums";
import { MessagesWorkspace } from "@/components/communication/messages-workspace";
import { requirePortalAccess, requireUser } from "@/lib/auth";
import {
  getConversationPageData,
  getMessagesPageData,
} from "@/server/communication-service";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  await requirePortalAccess(UserPortal.MESSAGES);
  const user = await requireUser();
  const { conversationId } = await params;
  const [messagesPageData, data] = await Promise.all([
    getMessagesPageData(user.id, user.role),
    getConversationPageData(user.id, conversationId),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <MessagesWorkspace
      conversations={messagesPageData.conversations}
      currentUserId={user.id}
      currentUserRole={user.role}
      notifications={messagesPageData.notifications}
      quickStartUsers={messagesPageData.quickStartUsers}
      selectedConversation={data}
      unreadNotificationCount={messagesPageData.unreadNotificationCount}
    />
  );
}
