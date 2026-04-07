"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { hasPortalAccess } from "@/lib/access-control";
import { getCurrentUser } from "@/lib/auth";
import {
  problemChangeRequestSchema,
  reviewChangeRequestSchema,
  roadmapItemChangeRequestSchema,
  topicChangeRequestSchema,
} from "@/lib/validators/platform";
import {
  approveChangeRequest,
  rejectChangeRequest,
  submitProblemChangeRequest,
  submitRoadmapItemChangeRequest,
  submitTopicChangeRequest,
} from "@/server/content-change-requests";
import {
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  UserPortal,
} from "@/generated/prisma/enums";

type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function buildFieldErrorResponse(error: ZodError, fallback: string): ActionResult {
  const fieldErrors = error.issues.reduce<Record<string, string[] | undefined>>((accumulator, issue) => {
    const path = issue.path.map(String).join(".");
    const field = path || "form";
    const currentMessages = accumulator[field] ?? [];
    accumulator[field] = [...currentMessages, issue.message];
    return accumulator;
  }, {});

  return {
    ok: false,
    error: fallback,
    fieldErrors,
  };
}

function parseLineList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonField(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

function getEntityPortal(entityType: ChangeRequestEntityType) {
  if (entityType === ChangeRequestEntityType.TOPIC) {
    return UserPortal.TOPICS;
  }

  if (entityType === ChangeRequestEntityType.ROADMAP_ITEM) {
    return UserPortal.ROADMAP;
  }

  return UserPortal.PROBLEMS;
}

async function requireChangeRequestAccess(entityType: ChangeRequestEntityType) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Authentication required.",
    };
  }

  if (!hasPortalAccess(user, getEntityPortal(entityType))) {
    return {
      ok: false as const,
      error: "Your account cannot submit requests for this section.",
    };
  }

  return {
    ok: true as const,
    user,
  };
}

function revalidateApprovalSurfaces() {
  revalidatePath("/roadmap");
  revalidatePath("/topics");
  revalidatePath("/problems");
  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}

export async function submitTopicChangeRequestAction(formData: FormData): Promise<ActionResult> {
  const access = await requireChangeRequestAccess(ChangeRequestEntityType.TOPIC);

  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  let payload: unknown;

  try {
    const operationType = String(formData.get("operationType") ?? "") as ChangeRequestOperationType;
    payload = {
      entityType: ChangeRequestEntityType.TOPIC,
      operationType,
      entityId: String(formData.get("entityId") ?? "").trim() || undefined,
      summary: String(formData.get("summary") ?? ""),
      deletionReason: String(formData.get("deletionReason") ?? ""),
      data:
        operationType === ChangeRequestOperationType.DELETE
          ? undefined
          : {
              name: formData.get("name"),
              slug: formData.get("slug"),
              level: formData.get("level"),
              sortOrder: formData.get("sortOrder"),
              conceptSummary: formData.get("conceptSummary"),
              notes: formData.get("notes"),
              difficultyProgression: parseLineList(formData.get("difficultyProgression")),
              revisionChecklist: parseLineList(formData.get("revisionChecklist")),
              quiz: parseJsonField(formData.get("quiz")),
              estimatedHours: formData.get("estimatedHours"),
              icon: formData.get("icon"),
              accentColor: formData.get("accentColor"),
            },
    };
  } catch {
    return {
      ok: false,
      error: "Use valid JSON for the quiz field before submitting the request.",
      fieldErrors: {
        quiz: ["Use a JSON array of { question, answer } items."],
      },
    };
  }

  const parsed = topicChangeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return buildFieldErrorResponse(parsed.error, "Fix the highlighted topic request fields.");
  }

  try {
    await submitTopicChangeRequest({
      requestedById: access.user.id,
      operationType: parsed.data.operationType,
      entityId: parsed.data.entityId,
      summary: parsed.data.summary,
      data: parsed.data.data,
      deletionReason: parsed.data.deletionReason,
    });
    revalidateApprovalSurfaces();

    return {
      ok: true,
      message: "Your change request has been sent for admin approval.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to submit this topic request right now.",
    };
  }
}

export async function submitRoadmapItemChangeRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const access = await requireChangeRequestAccess(ChangeRequestEntityType.ROADMAP_ITEM);

  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const operationType = String(formData.get("operationType") ?? "") as ChangeRequestOperationType;
  const payload = {
    entityType: ChangeRequestEntityType.ROADMAP_ITEM,
    operationType,
    entityId: String(formData.get("entityId") ?? "").trim() || undefined,
    summary: String(formData.get("summary") ?? ""),
    deletionReason: String(formData.get("deletionReason") ?? ""),
    data:
      operationType === ChangeRequestOperationType.DELETE
        ? undefined
        : {
            title: formData.get("title"),
            slug: formData.get("slug"),
            level: formData.get("level"),
            summary: formData.get("itemSummary"),
            details: formData.get("details"),
            sortOrder: formData.get("sortOrder"),
            topicId: formData.get("topicId"),
          },
  };

  const parsed = roadmapItemChangeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return buildFieldErrorResponse(parsed.error, "Fix the highlighted roadmap request fields.");
  }

  try {
    await submitRoadmapItemChangeRequest({
      requestedById: access.user.id,
      operationType: parsed.data.operationType,
      entityId: parsed.data.entityId,
      summary: parsed.data.summary,
      data: parsed.data.data,
      deletionReason: parsed.data.deletionReason,
    });
    revalidateApprovalSurfaces();

    return {
      ok: true,
      message: "Your change request has been sent for admin approval.",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to submit this roadmap request right now.",
    };
  }
}

export async function submitProblemChangeRequestAction(formData: FormData): Promise<ActionResult> {
  const access = await requireChangeRequestAccess(ChangeRequestEntityType.PROBLEM);

  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  let payload: unknown;

  try {
    const operationType = String(formData.get("operationType") ?? "") as ChangeRequestOperationType;
    payload = {
      entityType: ChangeRequestEntityType.PROBLEM,
      operationType,
      entityId: String(formData.get("entityId") ?? "").trim() || undefined,
      summary: String(formData.get("summary") ?? ""),
      deletionReason: String(formData.get("deletionReason") ?? ""),
      data:
        operationType === ChangeRequestOperationType.DELETE
          ? undefined
          : {
              title: formData.get("title"),
              slug: formData.get("slug"),
              difficulty: formData.get("difficulty"),
              topicId: formData.get("topicId"),
              problemStatement: formData.get("problemStatement"),
              examples: parseJsonField(formData.get("examples")),
              constraints: parseLineList(formData.get("constraints")),
              hints: parseLineList(formData.get("hints")),
              editorial: formData.get("editorial"),
              similarProblemSlugs: parseLineList(formData.get("similarProblemSlugs")),
              roleFocus: formData.get("roleFocus"),
              frequency: formData.get("frequency"),
              estimatedMinutes: formData.get("estimatedMinutes"),
              codeExecutionEnabled:
                String(formData.get("codeExecutionEnabled") ?? "") === "true" ||
                String(formData.get("codeExecutionEnabled") ?? "") === "on",
              starterCode: formData.get("starterCode"),
              starterLanguage: formData.get("starterLanguage"),
              companyTags: parseJsonField(formData.get("companyTags")),
              testCases: parseJsonField(formData.get("testCases")) ?? [],
            },
    };
  } catch {
    return {
      ok: false,
      error: "Use valid JSON for examples, company tags, and test cases before submitting.",
      fieldErrors: {
        examples: ["Use a JSON array of { input, output, explanation } objects."],
        companyTags: ["Use a JSON array of { companyId, frequency, role?, notes? } objects."],
        testCases: ["Use a JSON array of { label?, input, expectedOutput, isHidden?, sortOrder } objects."],
      },
    };
  }

  const parsed = problemChangeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return buildFieldErrorResponse(parsed.error, "Fix the highlighted problem request fields.");
  }

  try {
    await submitProblemChangeRequest({
      requestedById: access.user.id,
      operationType: parsed.data.operationType,
      entityId: parsed.data.entityId,
      summary: parsed.data.summary,
      data: parsed.data.data,
      deletionReason: parsed.data.deletionReason,
    });
    revalidateApprovalSurfaces();

    return {
      ok: true,
      message: "Your change request has been sent for admin approval.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to submit this problem request right now.",
    };
  }
}

async function requireAdminApprovalAccess() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Authentication required.",
    };
  }

  if (!hasPortalAccess(user, UserPortal.ADMIN_PORTAL)) {
    return {
      ok: false as const,
      error: "Only admins can review change requests.",
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function reviewChangeRequestAction(formData: FormData): Promise<ActionResult> {
  const access = await requireAdminApprovalAccess();

  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const parsed = reviewChangeRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    rejectionReason: formData.get("rejectionReason"),
  });

  if (!parsed.success) {
    return buildFieldErrorResponse(parsed.error, "Fix the review form before continuing.");
  }

  try {
    if (parsed.data.status === ChangeRequestStatus.APPROVED) {
      await approveChangeRequest({
        requestId: parsed.data.requestId,
        reviewerId: access.user.id,
      });
    } else {
      await rejectChangeRequest({
        requestId: parsed.data.requestId,
        reviewerId: access.user.id,
        rejectionReason: parsed.data.rejectionReason ?? "Rejected by admin review.",
      });
    }

    revalidateApprovalSurfaces();

    return {
      ok: true,
      message:
        parsed.data.status === ChangeRequestStatus.APPROVED
          ? "Change request approved and published."
          : "Change request rejected.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to review this change request right now.",
    };
  }
}
