import { Role } from "@/generated/prisma/enums";

export function hasRole(currentRole: Role | null | undefined, allowed: Role[]) {
  return currentRole ? allowed.includes(currentRole) : false;
}

export function canAccessAdmin(role: Role | null | undefined) {
  return role === Role.ADMIN;
}

export function canAccessCompanyPortal(role: Role | null | undefined) {
  return role === Role.COMPANY || role === Role.ADMIN;
}

export function canUseStudentDashboard(role: Role | null | undefined) {
  return role === Role.STUDENT || role === Role.ADMIN;
}

export function canUseMentorTools(role: Role | null | undefined) {
  return role === Role.MENTOR || role === Role.ADMIN;
}
