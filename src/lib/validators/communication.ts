import {
  CallType,
  GroupJoinPolicy,
  GroupJoinRequestStatus,
  GroupPrivacy,
  SignalingEventType,
} from "@/generated/prisma/enums";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || z.url().safeParse(value).success, "Enter a valid URL.");

export const createGroupSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(12).max(600),
  imageUrl: optionalUrl,
  category: optionalText(60),
  privacy: z.enum(GroupPrivacy),
  joinPolicy: z.enum(GroupJoinPolicy),
});

export const updateGroupSchema = createGroupSchema.extend({
  groupId: z.string().min(1),
});

export const groupMembershipSchema = z.object({
  groupId: z.string().min(1),
});

export const groupJoinRequestSchema = z.object({
  groupId: z.string().min(1),
  message: optionalText(280),
});

export const reviewGroupJoinRequestSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(GroupJoinRequestStatus).refine(
    (status) =>
      status === GroupJoinRequestStatus.APPROVED ||
      status === GroupJoinRequestStatus.REJECTED,
    "Choose approve or reject.",
  ),
});

export const removeGroupMemberSchema = z.object({
  groupId: z.string().min(1),
  memberId: z.string().min(1),
});

export const directConversationSchema = z.object({
  targetUserId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().min(1).max(5000),
});

export const connectionRequestSchema = z.object({
  targetUserId: z.string().min(1),
});

export const respondConnectionRequestSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["ACCEPT", "REJECT", "CANCEL"]),
});

export const removeConnectionSchema = z.object({
  targetUserId: z.string().min(1),
});

export const blockUserSchema = z.object({
  targetUserId: z.string().min(1),
});

export const unblockUserSchema = z.object({
  targetUserId: z.string().min(1),
});

export const startCallSchema = z.object({
  conversationId: z.string().min(1),
  callType: z.enum(CallType),
});

export const updateCallParticipantSchema = z.object({
  callSessionId: z.string().min(1),
  action: z.enum(["ACCEPT", "DECLINE", "JOIN", "LEAVE", "END", "MISS"]),
});

export const callSignalSchema = z.object({
  type: z.enum(SignalingEventType),
  payload: z.unknown(),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1),
});
