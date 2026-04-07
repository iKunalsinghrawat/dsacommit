import {
  CareerTarget,
  ChangeRequestEntityType,
  ChangeRequestOperationType,
  ChangeRequestStatus,
  CodeLanguage,
  CommunityPostType,
  Difficulty,
  ProfileVisibility,
  Role,
  RoadmapLevel,
  StudentLevel,
  SubmissionState,
  UserPortal,
  UserStatus,
} from "@/generated/prisma/enums";
import { passwordSchema } from "@/lib/validators/auth";
import { z } from "zod";

export const MAX_CODE_SIZE = 50000;

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

const optionalBoolean = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("off"), z.null(), z.undefined()])
  .transform((value) => value === "on" || value === "true");

const quizItemSchema = z.object({
  question: z.string().trim().min(3).max(220),
  answer: z.string().trim().min(3).max(400),
});

const problemExampleSchema = z.object({
  input: z.string().trim().min(1).max(4000),
  output: z.string().trim().min(1).max(4000),
  explanation: z.string().trim().min(3).max(4000),
});

const problemCompanyTagSchema = z.object({
  companyId: z.string().min(1),
  frequency: z.coerce.number().int().min(1).max(5),
  role: optionalText(80),
  notes: optionalText(240),
});

const problemTestCaseSchema = z.object({
  label: optionalText(80),
  input: z.string().trim().min(1).max(4000),
  expectedOutput: z.string().trim().min(1).max(4000),
  isHidden: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(1).max(1000),
});

export const topicRequestDataSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  level: z.enum(RoadmapLevel),
  sortOrder: z.coerce.number().int().min(1).max(999),
  conceptSummary: z.string().trim().min(20).max(600),
  notes: z.string().trim().min(20).max(3000),
  difficultyProgression: z.array(z.string().trim().min(3).max(200)).min(1).max(8),
  revisionChecklist: z.array(z.string().trim().min(3).max(200)).min(1).max(10),
  quiz: z.array(quizItemSchema).min(1).max(10),
  estimatedHours: z.coerce.number().int().min(1).max(400),
  icon: z.string().trim().min(2).max(60),
  accentColor: z.string().trim().min(2).max(40),
});

export const roadmapItemRequestDataSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  level: z.enum(RoadmapLevel),
  summary: z.string().trim().min(12).max(500),
  details: z.string().trim().min(12).max(3000),
  sortOrder: z.coerce.number().int().min(1).max(999),
  topicId: z.string().trim().min(1).optional().transform((value) => value || undefined),
});

export const problemRequestDataSchema = z.object({
  title: z.string().trim().min(4).max(140),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  difficulty: z.enum(Difficulty),
  topicId: z.string().min(1),
  problemStatement: z.string().trim().min(20).max(6000),
  examples: z.array(problemExampleSchema).min(1).max(10),
  constraints: z.array(z.string().trim().min(2).max(240)).min(1).max(12),
  hints: z.array(z.string().trim().min(3).max(500)).min(1).max(12),
  editorial: z.string().trim().min(20).max(5000),
  similarProblemSlugs: z.array(z.string().trim().min(3).max(140)).max(12),
  roleFocus: optionalText(80),
  frequency: z.coerce.number().int().min(1).max(5),
  estimatedMinutes: z.coerce.number().int().min(5).max(240),
  codeExecutionEnabled: z.boolean(),
  starterCode: optionalText(MAX_CODE_SIZE),
  starterLanguage: z.enum(CodeLanguage),
  companyTags: z.array(problemCompanyTagSchema).max(20),
  testCases: z.array(problemTestCaseSchema).max(20),
});

const createRequestSchema = z.object({
  operationType: z.enum(ChangeRequestOperationType),
  entityId: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(6).max(180),
});

export const topicChangeRequestSchema = createRequestSchema.extend({
  entityType: z.literal(ChangeRequestEntityType.TOPIC),
  data: topicRequestDataSchema.optional(),
  deletionReason: optionalText(280),
}).superRefine((values, ctx) => {
  if (values.operationType !== ChangeRequestOperationType.DELETE && !values.data) {
    ctx.addIssue({ code: "custom", path: ["data"], message: "Topic details are required." });
  }

  if (values.operationType !== ChangeRequestOperationType.CREATE && !values.entityId) {
    ctx.addIssue({ code: "custom", path: ["entityId"], message: "Choose a live topic to update or remove." });
  }
});

export const roadmapItemChangeRequestSchema = createRequestSchema.extend({
  entityType: z.literal(ChangeRequestEntityType.ROADMAP_ITEM),
  data: roadmapItemRequestDataSchema.optional(),
  deletionReason: optionalText(280),
}).superRefine((values, ctx) => {
  if (values.operationType !== ChangeRequestOperationType.DELETE && !values.data) {
    ctx.addIssue({ code: "custom", path: ["data"], message: "Roadmap item details are required." });
  }

  if (values.operationType !== ChangeRequestOperationType.CREATE && !values.entityId) {
    ctx.addIssue({ code: "custom", path: ["entityId"], message: "Choose a live roadmap item to update or remove." });
  }
});

export const problemChangeRequestSchema = createRequestSchema.extend({
  entityType: z.literal(ChangeRequestEntityType.PROBLEM),
  data: problemRequestDataSchema.optional(),
  deletionReason: optionalText(280),
}).superRefine((values, ctx) => {
  if (values.operationType !== ChangeRequestOperationType.DELETE && !values.data) {
    ctx.addIssue({ code: "custom", path: ["data"], message: "Problem details are required." });
  }

  if (values.operationType !== ChangeRequestOperationType.CREATE && !values.entityId) {
    ctx.addIssue({ code: "custom", path: ["entityId"], message: "Choose a live problem to update or remove." });
  }
});

export const reviewChangeRequestSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(ChangeRequestStatus).refine(
    (status) => status === ChangeRequestStatus.APPROVED || status === ChangeRequestStatus.REJECTED,
    "Choose approve or reject.",
  ),
  rejectionReason: optionalText(500),
}).superRefine((values, ctx) => {
  if (values.status === ChangeRequestStatus.REJECTED && !values.rejectionReason) {
    ctx.addIssue({
      code: "custom",
      path: ["rejectionReason"],
      message: "Add a short reason before rejecting a request.",
    });
  }
});

export const dailyCheckinSchema = z.object({
  targetMinutes: z.coerce.number().min(15).max(720),
  minutesCommitted: z.coerce.number().min(15).max(720),
  note: z.string().min(4).max(280),
  shareToWall: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
});

export const problemStatusSchema = z.object({
  problemId: z.string().min(1),
  status: z.enum(SubmissionState),
});

export const toggleBookmarkSchema = z.object({
  problemId: z.string().min(1),
});

export const toggleRevisionSchema = z.object({
  problemId: z.string().min(1),
});

export const mentorFollowSchema = z.object({
  mentorId: z.string().min(1),
});

export const mentorQuestionSchema = z.object({
  mentorId: z.string().min(1),
  title: z.string().min(4).max(120),
  question: z.string().min(12).max(1000),
});

export const communityPostSchema = z.object({
  type: z.enum(CommunityPostType),
  title: z.string().min(6).max(140),
  content: z.string().min(20).max(1500),
  topicId: z.string().optional(),
  companyId: z.string().optional(),
});

export const updateCommunityPostSchema = z.object({
  postId: z.string().min(1),
  type: z.enum(CommunityPostType),
  title: z.string().trim().min(6).max(140),
  content: z.string().trim().min(20).max(1500),
  topicId: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional(),
});

export const deleteCommunityPostSchema = z.object({
  postId: z.string().min(1),
});

export const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(3).max(300),
});

export const postLikeSchema = z.object({
  postId: z.string().min(1),
});

export const challengeJoinSchema = z.object({
  challengeId: z.string().min(1),
});

export const companyRoleSchema = z.object({
  title: z.string().min(3).max(80),
  roleType: z.string().min(2).max(40),
  focusAreas: z.string().min(3).max(200),
  location: z.string().min(2).max(60),
});

export const companyContentSchema = z.object({
  title: z.string().min(4).max(100),
  content: z.string().min(12).max(1200),
  category: z.enum(["GUIDANCE", "EVENT"]),
});

export const adminFeatureSchema = z.object({
  entityType: z.enum(["company", "mentor", "problem"]),
  entityId: z.string().min(1),
});

export const adminReportedPostSchema = z.object({
  postId: z.string().min(1),
});

export const problemExecutionSchema = z.object({
  language: z.enum(CodeLanguage),
  code: z.string().trim().min(1).max(MAX_CODE_SIZE),
});

export const problemDraftSchema = z.object({
  language: z.enum(CodeLanguage),
  code: z.string().max(MAX_CODE_SIZE),
});

export const deleteProblemDraftSchema = z.object({
  language: z.enum(CodeLanguage),
});

const manageUserFields = z.object({
    userId: z.string().min(1),
    name: z.string().trim().min(2, "Enter the user's full name.").max(80),
    email: z.email("Enter a valid email."),
    slug: z
      .string()
      .trim()
      .min(3, "Choose a handle with at least 3 characters.")
      .max(50)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
    role: z.enum(Role),
    status: z.enum(UserStatus),
    profileVisibility: z.enum(ProfileVisibility),
    accessGrants: z.array(z.enum(UserPortal)).default([]),
    headline: optionalText(80),
    bio: optionalText(500),
    location: optionalText(80),
    avatarUrl: optionalUrl,
    githubUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    portfolioUrl: optionalUrl,
    isVerified: optionalBoolean,
    isFeatured: optionalBoolean,
    studentCurrentLevel: z.enum(StudentLevel).optional(),
    studentTarget: z.enum(CareerTarget).optional(),
    studentDailyAvailableHours: z.coerce.number().min(1).max(12).optional(),
    studentPreferredLanguage: optionalText(40),
    studentAbout: optionalText(500),
    studentTargetCompanyIds: z.array(z.string().min(1)).default([]),
    studentWeakTopicIds: z.array(z.string().min(1)).default([]),
    mentorCompanyId: optionalText(120),
    mentorRoleTitle: optionalText(80),
    mentorExperienceYears: z.coerce.number().min(0).max(40).optional(),
    mentorBio: optionalText(500),
    mentorExpertiseTags: optionalText(240),
    mentorOfficeHours: optionalText(120),
    companyName: optionalText(80),
    companyIndustry: optionalText(80),
    companyWebsite: optionalUrl,
    companyOverview: optionalText(1200),
  });

export const adminManageUserSchema = manageUserFields.superRefine((values, ctx) => {
    if (values.role !== Role.ADMIN && values.accessGrants.includes(UserPortal.ADMIN_PORTAL)) {
      ctx.addIssue({
        code: "custom",
        path: ["accessGrants"],
        message: "Only admin accounts can keep admin portal access.",
      });
    }

    if (values.role !== Role.ADMIN && values.accessGrants.includes(UserPortal.MODERATION)) {
      ctx.addIssue({
        code: "custom",
        path: ["accessGrants"],
        message: "Only admin accounts can keep moderation access.",
      });
    }

    if (
      values.role !== Role.COMPANY &&
      values.role !== Role.ADMIN &&
      values.accessGrants.includes(UserPortal.COMPANY_PORTAL)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accessGrants"],
        message: "Only company and admin accounts can keep company portal access.",
      });
    }

    if (values.role === Role.STUDENT) {
      if (!values.studentCurrentLevel) {
        ctx.addIssue({ code: "custom", path: ["studentCurrentLevel"], message: "Choose a student level." });
      }
      if (!values.studentTarget) {
        ctx.addIssue({ code: "custom", path: ["studentTarget"], message: "Choose a target." });
      }
      if (!values.studentDailyAvailableHours) {
        ctx.addIssue({
          code: "custom",
          path: ["studentDailyAvailableHours"],
          message: "Add daily available hours.",
        });
      }
      if (!values.studentPreferredLanguage) {
        ctx.addIssue({
          code: "custom",
          path: ["studentPreferredLanguage"],
          message: "Add a preferred language.",
        });
      }
    }

    if (values.role === Role.MENTOR) {
      if (!values.mentorRoleTitle) {
        ctx.addIssue({ code: "custom", path: ["mentorRoleTitle"], message: "Add the mentor role title." });
      }
      if (values.mentorExperienceYears === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["mentorExperienceYears"],
          message: "Add mentor experience.",
        });
      }
      if (!values.mentorBio) {
        ctx.addIssue({ code: "custom", path: ["mentorBio"], message: "Add a mentor bio." });
      }
    }

    if (values.role === Role.COMPANY && !values.companyName) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Add the company name." });
    }
  });

export const adminChangeUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(UserStatus),
});

export const adminRemoveUserSchema = z.object({
  userId: z.string().min(1),
});

export const adminResetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  temporaryPassword: passwordSchema,
  forcePasswordReset: optionalBoolean,
});

export const selfPasswordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .superRefine((values, ctx) => {
    if (values.currentPassword === values.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Choose a password different from the current one.",
      });
    }

    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });
