import {
  ConversationType,
  GroupMemberRole,
  Role,
} from "@/generated/prisma/enums";

export function canonicalizeUserPair(userAId: string, userBId: string) {
  return [userAId, userBId].sort() as [string, string];
}

export function createDirectConversationKey(userAId: string, userBId: string) {
  const [firstUserId, secondUserId] = canonicalizeUserPair(userAId, userBId);
  return `${firstUserId}:${secondUserId}`;
}

export function canManageGroupMembership(role: GroupMemberRole) {
  return role === GroupMemberRole.OWNER || role === GroupMemberRole.ADMIN;
}

export function canCreateStudentGroup(role: Role) {
  return role === Role.STUDENT || role === Role.ADMIN;
}

export function isStudentMentorPair(roleA: Role, roleB: Role) {
  return (
    (roleA === Role.STUDENT && roleB === Role.MENTOR) ||
    (roleA === Role.MENTOR && roleB === Role.STUDENT)
  );
}

export function isStudentStudentPair(roleA: Role, roleB: Role) {
  return roleA === Role.STUDENT && roleB === Role.STUDENT;
}

export function canUseDirectConversation(roleA: Role, roleB: Role) {
  return isStudentStudentPair(roleA, roleB) || isStudentMentorPair(roleA, roleB);
}

export function requiresAcceptedConnectionForDirectConversation(roleA: Role, roleB: Role) {
  return isStudentStudentPair(roleA, roleB);
}

export function canStartCallForConversation(type: ConversationType) {
  return type === ConversationType.DIRECT;
}
