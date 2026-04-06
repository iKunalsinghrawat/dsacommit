"use server";

import { addDays, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";

import { Role, SubmissionState, UserPortal } from "@/generated/prisma/enums";
import { hasPortalAccess } from "@/lib/access-control";
import { getCurrentUser, requirePortalAccess, requireRoleAndPortal } from "@/lib/auth";
import { canDeleteCommunityPost, canEditCommunityPost } from "@/lib/community-permissions";
import { prisma } from "@/lib/prisma";
import { refreshStudentProfile } from "@/lib/student-progress";
import {
  adminFeatureSchema,
  adminReportedPostSchema,
  challengeJoinSchema,
  commentSchema,
  companyContentSchema,
  companyRoleSchema,
  communityPostSchema,
  deleteCommunityPostSchema,
  dailyCheckinSchema,
  mentorFollowSchema,
  mentorQuestionSchema,
  updateCommunityPostSchema,
  postLikeSchema,
  problemStatusSchema,
  toggleBookmarkSchema,
  toggleRevisionSchema,
} from "@/lib/validators/platform";

export type CommunityPostMutationResult = {
  ok: boolean;
  error?: string;
  message?: string;
  postId?: string;
};

export async function submitDailyCheckinAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.DASHBOARD);
  const parsed = dailyCheckinSchema.safeParse({
    targetMinutes: formData.get("targetMinutes"),
    minutesCommitted: formData.get("minutesCommitted"),
    note: formData.get("note"),
    shareToWall: formData.get("shareToWall"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid daily check-in.");
  }

  const today = startOfDay(new Date());
  await prisma.dailyCheckin.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    create: {
      userId: user.id,
      date: today,
      targetMinutes: parsed.data.targetMinutes,
      minutesCommitted: parsed.data.minutesCommitted,
      note: parsed.data.note,
      solvedCount: parsed.data.minutesCommitted >= 120 ? 2 : 1,
      pointsEarned: Math.round(parsed.data.minutesCommitted / 12),
      sharedToWall: parsed.data.shareToWall,
    },
    update: {
      targetMinutes: parsed.data.targetMinutes,
      minutesCommitted: parsed.data.minutesCommitted,
      note: parsed.data.note,
      solvedCount: parsed.data.minutesCommitted >= 120 ? 2 : 1,
      pointsEarned: Math.round(parsed.data.minutesCommitted / 12),
      sharedToWall: parsed.data.shareToWall,
    },
  });

  if (parsed.data.shareToWall) {
    await prisma.commitmentPost.create({
      data: {
        userId: user.id,
        caption: parsed.data.note,
        minutesCommitted: parsed.data.minutesCommitted,
        solvedCount: parsed.data.minutesCommitted >= 120 ? 2 : 1,
        isPublic: true,
      },
    });
  }

  await refreshStudentProfile(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function updateProblemStatusAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.PROBLEMS);
  const parsed = problemStatusSchema.safeParse({
    problemId: formData.get("problemId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Invalid problem state.");
  }

  if (parsed.data.status === SubmissionState.UNSOLVED) {
    await prisma.submissionStatus.deleteMany({
      where: { userId: user.id, problemId: parsed.data.problemId },
    });
  } else {
    await prisma.submissionStatus.upsert({
      where: {
        userId_problemId: {
          userId: user.id,
          problemId: parsed.data.problemId,
        },
      },
      create: {
        userId: user.id,
        problemId: parsed.data.problemId,
        status: parsed.data.status,
        attempts: parsed.data.status === SubmissionState.SOLVED ? 1 : 2,
        lastViewedAt: new Date(),
        solvedAt: parsed.data.status === SubmissionState.SOLVED ? new Date() : null,
      },
      update: {
        status: parsed.data.status,
        attempts: { increment: 1 },
        lastViewedAt: new Date(),
        solvedAt: parsed.data.status === SubmissionState.SOLVED ? new Date() : null,
      },
    });
  }

  await refreshStudentProfile(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/problems");
}

export async function toggleBookmarkAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.PROBLEMS);
  const parsed = toggleBookmarkSchema.safeParse({
    problemId: formData.get("problemId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid bookmark request.");
  }

  const existing = await prisma.bookmark.findUnique({
    where: {
      userId_problemId: {
        userId: user.id,
        problemId: parsed.data.problemId,
      },
    },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.bookmark.create({ data: { userId: user.id, problemId: parsed.data.problemId } });
  }

  await refreshStudentProfile(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function toggleRevisionAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.PROBLEMS);
  const parsed = toggleRevisionSchema.safeParse({
    problemId: formData.get("problemId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid revision request.");
  }

  const existing = await prisma.revisionQueue.findUnique({
    where: {
      userId_problemId: {
        userId: user.id,
        problemId: parsed.data.problemId,
      },
    },
  });

  if (existing) {
    await prisma.revisionQueue.delete({ where: { id: existing.id } });
  } else {
    await prisma.revisionQueue.create({
      data: {
        userId: user.id,
        problemId: parsed.data.problemId,
        remindOn: addDays(new Date(), 3),
        reason: "Queued for spaced revision after first pass.",
        priority: 2,
      },
    });
  }

  await refreshStudentProfile(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function joinChallengeAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.DASHBOARD);
  const parsed = challengeJoinSchema.safeParse({
    challengeId: formData.get("challengeId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid challenge request.");
  }

  await prisma.challengeParticipation.upsert({
    where: {
      challengeId_userId: {
        challengeId: parsed.data.challengeId,
        userId: user.id,
      },
    },
    create: {
      challengeId: parsed.data.challengeId,
      userId: user.id,
    },
    update: {},
  });

  revalidatePath("/dashboard");
}

export async function toggleMentorFollowAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.MENTORS);
  const parsed = mentorFollowSchema.safeParse({
    mentorId: formData.get("mentorId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid follow request.");
  }

  const existing = await prisma.mentorFollower.findFirst({
    where: { mentorId: parsed.data.mentorId, studentId: user.id },
  });

  if (existing) {
    await prisma.mentorFollower.delete({ where: { id: existing.id } });
  } else {
    await prisma.mentorFollower.create({
      data: { mentorId: parsed.data.mentorId, studentId: user.id },
    });
  }

  revalidatePath("/mentors");
}

export async function createMentorQuestionAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.STUDENT], UserPortal.MENTORS);
  const parsed = mentorQuestionSchema.safeParse({
    mentorId: formData.get("mentorId"),
    title: formData.get("title"),
    question: formData.get("question"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid mentor question.");
  }

  await prisma.mentorQuestion.create({
    data: {
      mentorId: parsed.data.mentorId,
      studentId: user.id,
      title: parsed.data.title,
      question: parsed.data.question,
    },
  });

  revalidatePath("/mentors");
}

export async function createCommunityPostAction(formData: FormData) {
  const user = await requirePortalAccess(UserPortal.POSTING);
  const parsed = communityPostSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    content: formData.get("content"),
    topicId: formData.get("topicId") || undefined,
    companyId: formData.get("companyId") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid community post.");
  }

  await prisma.communityPost.create({
    data: {
      authorId: user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      topicId: parsed.data.topicId,
      companyId: parsed.data.companyId,
    },
  });

  revalidatePath("/community");
}

export async function updateCommunityPostAction(
  formData: FormData,
): Promise<CommunityPostMutationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: "Please sign in again to edit this post." };
  }

  if (!hasPortalAccess(user, UserPortal.POSTING)) {
    return { ok: false, error: "Your account no longer has posting access." };
  }

  const parsed = updateCommunityPostSchema.safeParse({
    postId: formData.get("postId"),
    type: formData.get("type"),
    title: formData.get("title"),
    content: formData.get("content"),
    topicId: formData.get("topicId") || undefined,
    companyId: formData.get("companyId") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid community post update.",
    };
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { ok: false, error: "This post no longer exists." };
  }

  if (!canEditCommunityPost(user, post)) {
    return { ok: false, error: "You can only edit posts that you created." };
  }

  await prisma.communityPost.update({
    where: { id: parsed.data.postId },
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      topicId: parsed.data.topicId,
      companyId: parsed.data.companyId,
    },
  });

  revalidatePath("/community");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Post updated successfully.",
    postId: parsed.data.postId,
  };
}

export async function deleteCommunityPostAction(
  formData: FormData,
): Promise<CommunityPostMutationResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: "Please sign in again to delete this post." };
  }

  if (!hasPortalAccess(user, UserPortal.COMMUNITY)) {
    return { ok: false, error: "Your account no longer has community access." };
  }

  const parsed = deleteCommunityPostSchema.safeParse({
    postId: formData.get("postId"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { ok: false, error: "This post has already been removed." };
  }

  if (!canDeleteCommunityPost(user, post)) {
    return { ok: false, error: "You are not allowed to delete this post." };
  }

  await prisma.communityPost.delete({
    where: { id: parsed.data.postId },
  });

  revalidatePath("/community");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Post deleted successfully.",
    postId: parsed.data.postId,
  };
}

export async function createCommentAction(formData: FormData) {
  const user = await requirePortalAccess(UserPortal.POSTING);
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment.");
  }

  await prisma.comment.create({
    data: {
      postId: parsed.data.postId,
      authorId: user.id,
      content: parsed.data.content,
    },
  });

  const commentCount = await prisma.comment.count({ where: { postId: parsed.data.postId } });
  await prisma.communityPost.update({
    where: { id: parsed.data.postId },
    data: { commentCount },
  });

  revalidatePath("/community");
}

export async function togglePostLikeAction(formData: FormData) {
  const user = await requirePortalAccess(UserPortal.COMMUNITY);
  const parsed = postLikeSchema.safeParse({
    postId: formData.get("postId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid like request.");
  }

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: parsed.data.postId, userId: user.id } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({ data: { postId: parsed.data.postId, userId: user.id } });
  }

  const likeCount = await prisma.postLike.count({ where: { postId: parsed.data.postId } });
  await prisma.communityPost.update({
    where: { id: parsed.data.postId },
    data: { likeCount },
  });

  revalidatePath("/community");
}

export async function createCompanyRoleAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.COMPANY, Role.ADMIN], UserPortal.COMPANY_PORTAL);
  const parsed = companyRoleSchema.safeParse({
    title: formData.get("title"),
    roleType: formData.get("roleType"),
    focusAreas: formData.get("focusAreas"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company role.");
  }

  const company = await prisma.companyProfile.findFirst({
    where: { ownerId: user.id },
  });

  if (!company) {
    throw new Error("No company profile found for this account.");
  }

  await prisma.companyRole.create({
    data: {
      companyId: company.id,
      title: parsed.data.title,
      roleType: parsed.data.roleType,
      focusAreas: parsed.data.focusAreas.split(",").map((value) => value.trim()).filter(Boolean),
      location: parsed.data.location,
    },
  });

  revalidatePath("/company-portal");
}

export async function createCompanyContentAction(formData: FormData) {
  const user = await requireRoleAndPortal([Role.COMPANY, Role.ADMIN], UserPortal.COMPANY_PORTAL);
  const parsed = companyContentSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company content.");
  }

  const company = await prisma.companyProfile.findFirst({
    where: { ownerId: user.id },
  });

  if (!company) {
    throw new Error("No company profile found for this account.");
  }

  await prisma.companyContent.create({
    data: {
      companyId: company.id,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
    },
  });

  revalidatePath("/company-portal");
}

export async function toggleFeatureEntityAction(formData: FormData) {
  await requireRoleAndPortal([Role.ADMIN], UserPortal.ADMIN_PORTAL);
  const parsed = adminFeatureSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid admin request.");
  }

  if (parsed.data.entityType === "company") {
    const current = await prisma.companyProfile.findUnique({ where: { id: parsed.data.entityId } });
    await prisma.companyProfile.update({
      where: { id: parsed.data.entityId },
      data: { featured: !current?.featured },
    });
  }

  if (parsed.data.entityType === "mentor") {
    const current = await prisma.mentorProfile.findUnique({ where: { userId: parsed.data.entityId } });
    await prisma.mentorProfile.update({
      where: { userId: parsed.data.entityId },
      data: { featured: !current?.featured },
    });
  }

  if (parsed.data.entityType === "problem") {
    const current = await prisma.problem.findUnique({ where: { id: parsed.data.entityId } });
    await prisma.problem.update({
      where: { id: parsed.data.entityId },
      data: { isFeatured: !current?.isFeatured },
    });
  }

  revalidatePath("/admin");
}

export async function resolveReportedPostAction(formData: FormData) {
  await requireRoleAndPortal([Role.ADMIN], UserPortal.MODERATION);
  const parsed = adminReportedPostSchema.safeParse({
    postId: formData.get("postId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid moderation request.");
  }

  await prisma.communityPost.update({
    where: { id: parsed.data.postId },
    data: { isReported: false },
  });

  revalidatePath("/admin");
  revalidatePath("/community");
}
