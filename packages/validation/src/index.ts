import { z } from "zod";

const uuid = z.uuid();
const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const ExperienceModeSchema = z.enum(["explorer", "adventurer", "independence", "launch"]);

export const CreateFamilySchema = z.object({
  name: trimmedText(80),
  pointsName: trimmedText(24).default("Points"),
  timezone: trimmedText(80).refine(
    (value) => value === "UTC" || value.includes("/"),
    "Use an IANA timezone such as America/New_York.",
  ),
});

export const CreateChildSchema = z.object({
  displayName: trimmedText(40),
  experienceMode: ExperienceModeSchema,
  familyId: uuid,
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
});

export const GoalCategorySchema = z.enum([
  "chores",
  "school",
  "study",
  "reading",
  "exercise",
  "health",
  "hygiene",
  "routine",
  "pet_care",
  "music",
  "family",
  "financial_literacy",
  "personal_growth",
  "custom",
]);

export const GoalTypeSchema = z.enum([
  "one_time",
  "recurring",
  "habit",
  "timed_session",
  "quantity_target",
  "grade_target",
  "checklist",
  "challenge",
]);

export const CreateGoalSchema = z.object({
  approvalRequired: z.boolean(),
  category: GoalCategorySchema,
  childIds: z.array(uuid).min(1).max(20),
  familyId: uuid,
  goalType: GoalTypeSchema,
  instructions: z.string().trim().max(2_000).optional(),
  pointValue: z.number().int().min(0).max(1_000_000),
  recurrenceRule: z.string().trim().max(500).optional(),
  title: trimmedText(120),
});

export const CompletionEvidenceSchema = z.object({
  fileName: trimmedText(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/heic"]),
  sizeBytes: z.number().int().positive().max(10_000_000),
});

export const SubmitCompletionSchema = z.object({
  childId: uuid,
  childNote: z.string().trim().max(1_000).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  evidence: z.array(CompletionEvidenceSchema).max(3).default([]),
  familyId: uuid,
  idempotencyKey: trimmedText(128),
  occurrenceId: uuid,
});

export const RequestRedemptionSchema = z.object({
  childId: uuid,
  familyId: uuid,
  idempotencyKey: trimmedText(128),
  rewardId: uuid,
});

const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const OnboardingChildDraftSchema = z.object({
  clientId: trimmedText(80),
  displayName: trimmedText(40),
  experienceMode: ExperienceModeSchema,
  pinRequested: z.boolean(),
});

export const NotificationPreferencesSchema = z.object({
  approvalUpdates: z.boolean(),
  childEncouragement: z.boolean(),
  enabled: z.boolean(),
  quietHoursEnd: localTime,
  quietHoursStart: localTime,
  weeklySummary: z.boolean(),
});

export const ConfigureChildPinSchema = z.object({
  childId: uuid,
  pin: z.string().regex(/^\d{4,6}$/, "Use a 4 to 6 digit PIN."),
});

export const UnlockChildSchema = z.object({
  childId: uuid,
  now: z.number().int().nonnegative(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
});

export type CreateFamilyInput = z.infer<typeof CreateFamilySchema>;
export type CreateChildInput = z.infer<typeof CreateChildSchema>;
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type SubmitCompletionInput = z.infer<typeof SubmitCompletionSchema>;
export type RequestRedemptionCommandInput = z.infer<typeof RequestRedemptionSchema>;
export type OnboardingChildDraftInput = z.infer<typeof OnboardingChildDraftSchema>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type ConfigureChildPinInput = z.infer<typeof ConfigureChildPinSchema>;
export type UnlockChildInput = z.infer<typeof UnlockChildSchema>;
