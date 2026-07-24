import { describe, expect, it } from "vitest";

import {
  CreateChildSchema,
  CreateFamilySchema,
  CreateGoalSchema,
  ConfigureChildPinSchema,
  NotificationPreferencesSchema,
  OnboardingChildDraftSchema,
  RequestRedemptionSchema,
  SubmitCompletionSchema,
} from "./index";

const familyId = "10000000-0000-4000-8000-000000000001";
const childId = "20000000-0000-4000-8000-000000000001";

describe("shared validation", () => {
  it("normalizes safe family and child input", () => {
    expect(
      CreateFamilySchema.parse({
        name: "  Rivera Family  ",
        pointsName: "Stars",
        timezone: "America/New_York",
      }),
    ).toMatchObject({ name: "Rivera Family", pointsName: "Stars" });

    expect(
      CreateChildSchema.parse({
        displayName: "  Alex ",
        experienceMode: "adventurer",
        familyId,
      }),
    ).toMatchObject({ displayName: "Alex", experienceMode: "adventurer" });
  });

  it("requires an assigned child and bounded points for goals", () => {
    const result = CreateGoalSchema.safeParse({
      approvalRequired: true,
      category: "reading",
      childIds: [],
      familyId,
      goalType: "timed_session",
      pointValue: 1_000_001,
      title: "Read",
    });

    expect(result.success).toBe(false);
  });

  it("keeps completion evidence metadata small and credential-free", () => {
    const result = SubmitCompletionSchema.safeParse({
      childId,
      evidence: [
        {
          fileName: "reading.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 15_000_000,
        },
      ],
      familyId,
      idempotencyKey: "complete-2026-07-24",
      occurrenceId: "30000000-0000-4000-8000-000000000001",
    });

    expect(result.success).toBe(false);
  });

  it("requires stable identifiers for reward requests", () => {
    expect(
      RequestRedemptionSchema.safeParse({
        childId,
        familyId,
        idempotencyKey: "",
        rewardId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("accepts a synthetic child draft and strict optional PIN", () => {
    expect(
      OnboardingChildDraftSchema.parse({
        clientId: "child-draft-1",
        displayName: "Maya",
        experienceMode: "explorer",
        pinRequested: true,
      }),
    ).toMatchObject({ displayName: "Maya", pinRequested: true });

    expect(() =>
      ConfigureChildPinSchema.parse({
        childId: "20000000-0000-4000-8000-000000000001",
        pin: "12",
      }),
    ).toThrow();
  });

  it("requires valid quiet hours when notifications are enabled", () => {
    expect(
      NotificationPreferencesSchema.parse({
        approvalUpdates: true,
        childEncouragement: true,
        enabled: true,
        quietHoursEnd: "07:00",
        quietHoursStart: "20:30",
        weeklySummary: true,
      }),
    ).toMatchObject({ quietHoursStart: "20:30" });
  });
});
