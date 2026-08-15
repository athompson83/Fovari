import type { FamilySnapshot } from "@fovari/api-client";

import { createDemoSeed } from "../../data/fixtures";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};

const meaningfulSnapshot = (snapshot: FamilySnapshot) => {
  return canonicalize({
    achievements: snapshot.achievements,
    adult: snapshot.adult,
    calendar: snapshot.calendar,
    children: snapshot.children,
    completions: snapshot.completions,
    familyId: snapshot.familyId,
    familyName: snapshot.familyName,
    goals: snapshot.goals,
    ledger: snapshot.ledger,
    notificationPreferences: snapshot.notificationPreferences,
    onboarding: snapshot.onboarding,
    onboardingDraft: snapshot.onboardingDraft,
    pointsName: snapshot.pointsName,
    redemptions: snapshot.redemptions,
    rewards: snapshot.rewards,
    selectedRewardByChild: snapshot.selectedRewardByChild,
    timezone: snapshot.timezone,
  });
};

export const isUntouchedDemoSnapshot = (snapshot: FamilySnapshot): boolean =>
  JSON.stringify(meaningfulSnapshot(snapshot)) ===
  JSON.stringify(meaningfulSnapshot(createDemoSeed()));
