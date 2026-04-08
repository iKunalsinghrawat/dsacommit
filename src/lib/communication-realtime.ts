import {
  CallParticipantStatus,
  CallSessionStatus,
  CallType,
  NotificationType,
  Role,
} from "@/generated/prisma/enums";

export const COMMUNICATION_REALTIME_CHANNEL = "communication_events";

export type CommunicationRealtimeEventType =
  | "system:connected"
  | "message:new"
  | "conversation:update"
  | "notification:new"
  | "notification:read"
  | "call:incoming"
  | "call:accepted"
  | "call:declined"
  | "call:ended"
  | "call:missed"
  | "call:signal"
  | "presence:update";

export type CommunicationRealtimeUser = {
  id: string;
  name: string;
  slug?: string | null;
  role?: Role;
  headline?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  lastActiveAt?: string | null;
};

export type CommunicationRealtimeNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: CommunicationRealtimeUser | null;
};

export type CommunicationRealtimeCallParticipant = {
  userId: string;
  status: CallParticipantStatus;
  user: CommunicationRealtimeUser;
};

export type CommunicationRealtimeCall = {
  id: string;
  conversationId: string;
  callType: CallType;
  status: CallSessionStatus;
  initiatedById: string;
  initiatedBy: CommunicationRealtimeUser;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  participants: CommunicationRealtimeCallParticipant[];
};

export type CommunicationRealtimeMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: CommunicationRealtimeUser;
};

export type CommunicationRealtimeEvent = {
  id: string;
  type: CommunicationRealtimeEventType;
  createdAt: string;
  recipients: string[];
  conversationId?: string;
  callSessionId?: string;
  payload?: {
    message?: CommunicationRealtimeMessage;
    notification?: CommunicationRealtimeNotification;
    call?: CommunicationRealtimeCall;
    unreadNotificationCount?: number;
    notificationId?: string;
    reason?: string;
    userId?: string;
    isOnline?: boolean;
    lastActiveAt?: string;
  };
};

export function isCommunicationRealtimeEvent(
  value: unknown,
): value is CommunicationRealtimeEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<CommunicationRealtimeEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.type === "string" &&
    typeof event.createdAt === "string" &&
    Array.isArray(event.recipients)
  );
}
