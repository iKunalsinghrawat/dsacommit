import { CareerTarget, Role, StudentLevel } from "@/generated/prisma/enums";
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password should be at least 8 characters.")
  .regex(/[A-Z]/, "Add at least one uppercase letter.")
  .regex(/[a-z]/, "Add at least one lowercase letter.")
  .regex(/[0-9]/, "Add at least one number.");

export const signInSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Enter your full name."),
    email: z.email("Enter a valid email."),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(Role),
    currentLevel: z.enum(StudentLevel).optional(),
    target: z.enum(CareerTarget).optional(),
    dailyAvailableHours: z.coerce.number().min(1).max(12).optional(),
    targetCompanies: z.array(z.string()).default([]),
    weakTopics: z.array(z.string()).default([]),
    preferredLanguage: z.string().optional(),
    companyName: z.string().optional(),
    roleTitle: z.string().optional(),
    experienceYears: z.coerce.number().min(0).max(30).optional(),
    expertiseTags: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }

    if (values.role === Role.STUDENT) {
      if (!values.currentLevel) {
        ctx.addIssue({ code: "custom", path: ["currentLevel"], message: "Choose your level." });
      }
      if (!values.target) {
        ctx.addIssue({ code: "custom", path: ["target"], message: "Choose your target." });
      }
      if (!values.preferredLanguage) {
        ctx.addIssue({
          code: "custom",
          path: ["preferredLanguage"],
          message: "Choose your preferred language.",
        });
      }
    }

    if (values.role === Role.MENTOR) {
      if (!values.companyName) {
        ctx.addIssue({ code: "custom", path: ["companyName"], message: "Add your company." });
      }
      if (!values.roleTitle) {
        ctx.addIssue({ code: "custom", path: ["roleTitle"], message: "Add your role title." });
      }
    }

    if (values.role === Role.COMPANY && !values.companyName) {
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Add your company name." });
    }
  });

export function splitCsv(input?: string | null) {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
