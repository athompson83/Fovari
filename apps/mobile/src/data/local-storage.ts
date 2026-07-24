import AsyncStorage from "@react-native-async-storage/async-storage";

import type { FamilySnapshot } from "@fovari/api-client";
import { reducePointLedger } from "@fovari/domain";
import { NotificationPreferencesSchema, OnboardingChildDraftSchema } from "@fovari/validation";

import type { OfflineAction } from "./offline-queue";

const STORAGE_KEY = "fovari.local-family";
const MAX_COLLECTION_SIZE = 500;
const MAX_INTEGER = 1_000_000_000;
const MAX_SERIALIZED_LENGTH = 1_000_000;
const MAX_STRING_LENGTH = 4_096;

const childRoles = new Set(["child"]);
const familyRoles = new Set(["family_owner", "parent", "guardian", "caregiver", "child"]);
const experienceModes = new Set(["explorer", "adventurer", "independence", "launch"]);
const goalStatuses = new Set(["ready", "submitted", "approved", "completed"]);
const completionStatuses = new Set(["submitted", "approved", "needs_changes", "rejected"]);
const rewardTypes = new Set(["experience", "privilege", "physical_item", "savings_goal", "custom"]);
const redemptionStatuses = new Set([
  "requested",
  "approved",
  "scheduled",
  "fulfilled",
  "rejected",
  "refunded",
]);
const verificationTypes = new Set(["attestation", "checklist", "parent", "timer"]);
const ledgerTypes = new Set([
  "goal_reward",
  "bonus",
  "manual_award",
  "redemption",
  "refund",
  "adjustment",
  "expiration",
  "reversal",
]);
const onboardingSteps = new Set([
  "adult",
  "family",
  "children",
  "starter_goals",
  "starter_rewards",
  "notifications",
  "review",
]);
const onboardingCurrentSteps = new Set([...onboardingSteps, "complete"]);
const onboardingStatuses = new Set(["not_started", "in_progress", "complete"]);
const offlineCommandTypes = new Set([
  "save_checklist",
  "save_evidence_metadata",
  "save_timer",
  "select_reward",
  "submit_completion",
]);
const offlineStatuses = new Set([
  "pending",
  "syncing",
  "retryable_error",
  "completed",
  "permanent_error",
]);

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LocalFamilyEnvelopeV1 {
  nextSequence: number;
  offlineActions: readonly OfflineAction[];
  pinAttempts: Readonly<Record<string, { failures: number; lockedUntil?: number }>>;
  processedCommandIds: readonly string[];
  snapshot: FamilySnapshot;
  version: 1;
}

export const asyncStorage: KeyValueStorage = AsyncStorage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_STRING_LENGTH;

const isPossiblyEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_STRING_LENGTH;

const isOptionalString = (value: unknown) => value === undefined || isString(value);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const isInteger = (value: unknown, minimum = 0) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= minimum &&
  value <= MAX_INTEGER;

const isBoundedArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value) && value.length <= MAX_COLLECTION_SIZE;

const hasStringFields = (record: Record<string, unknown>, fields: readonly string[]) =>
  fields.every((field) => isString(record[field]));

const hasOptionalStringFields = (record: Record<string, unknown>, fields: readonly string[]) =>
  fields.every((field) => isOptionalString(record[field]));

const isStringRecord = (value: unknown) =>
  isRecord(value) &&
  Object.keys(value).length <= MAX_COLLECTION_SIZE &&
  Object.entries(value).every(([key, entry]) => isString(key) && isString(entry));

const isBooleanRecord = (value: unknown) =>
  isRecord(value) &&
  Object.keys(value).length <= MAX_COLLECTION_SIZE &&
  Object.entries(value).every(([key, entry]) => isString(key) && isBoolean(entry));

const isNotificationPreferences = (value: unknown) =>
  NotificationPreferencesSchema.safeParse(value).success;

const isLocalEnvelopeError = () =>
  new Error("Invalid local family data. Reset the synthetic family to continue.");

function isOfflineAction(value: unknown): value is OfflineAction {
  if (
    !isRecord(value) ||
    !hasStringFields(value, ["actorId", "createdAt", "entityId", "idempotencyKey"])
  ) {
    return false;
  }
  return (
    offlineCommandTypes.has(value.commandType as string) &&
    offlineStatuses.has(value.status as string) &&
    isInteger(value.attemptCount) &&
    isRecord(value.payload) &&
    hasOptionalStringFields(value, ["completedAt", "lastAttemptAt", "lastError"])
  );
}

function isPinAttempts(value: unknown): value is LocalFamilyEnvelopeV1["pinAttempts"] {
  return (
    isRecord(value) &&
    Object.keys(value).length <= MAX_COLLECTION_SIZE &&
    Object.entries(value).every(
      ([childId, attempt]) =>
        isString(childId) &&
        isRecord(attempt) &&
        isInteger(attempt.failures) &&
        (attempt.lockedUntil === undefined || isInteger(attempt.lockedUntil)),
    )
  );
}

function isSnapshot(value: unknown): value is FamilySnapshot {
  if (!isRecord(value)) return false;
  if (
    !hasStringFields(value, ["familyId", "pointsName", "timezone"]) ||
    !isPossiblyEmptyString(value.familyName) ||
    !isPossiblyEmptyString(value.activeChildId) ||
    !isBoundedArray(value.children) ||
    !isBoundedArray(value.achievements) ||
    !isBoundedArray(value.calendar) ||
    !isBoundedArray(value.completions) ||
    !isBoundedArray(value.goals) ||
    !isBoundedArray(value.ledger) ||
    !isBoundedArray(value.redemptions) ||
    !isBoundedArray(value.rewards) ||
    !isStringRecord(value.selectedRewardByChild) ||
    !isRecord(value.adult) ||
    !hasStringFields(value.adult, ["id", "displayName"]) ||
    !isRecord(value.notificationPreferences) ||
    !isRecord(value.onboarding) ||
    !isRecord(value.activeActor) ||
    !isRecord(value.session)
  ) {
    return false;
  }

  const childIds = new Set<string>();
  if (
    !value.children.every((child) => {
      if (
        !isRecord(child) ||
        !hasStringFields(child, ["id", "name", "avatarKey"]) ||
        !experienceModes.has(child.experienceMode as string) ||
        !isBoolean(child.pinConfigured) ||
        ![
          child.completedToday,
          child.level,
          child.points,
          child.streakDays,
          child.totalToday,
        ].every((number) => isInteger(number)) ||
        childIds.has(child.id as string)
      ) {
        return false;
      }
      childIds.add(child.id as string);
      return true;
    }) ||
    (childIds.size === 0
      ? value.activeChildId !== ""
      : !childIds.has(value.activeChildId as string))
  ) {
    return false;
  }

  const goalIds = new Set<string>();
  if (
    !value.goals.every((goal) => {
      if (
        !isRecord(goal) ||
        !hasStringFields(goal, [
          "id",
          "childId",
          "category",
          "dueLabel",
          "instructions",
          "title",
        ]) ||
        !childIds.has(goal.childId as string) ||
        !goalStatuses.has(goal.status as string) ||
        !verificationTypes.has(goal.verification as string) ||
        !isInteger(goal.pointValue) ||
        (goal.progressCurrent !== undefined && !isInteger(goal.progressCurrent)) ||
        (goal.progressTarget !== undefined && !isInteger(goal.progressTarget)) ||
        goalIds.has(goal.id as string)
      ) {
        return false;
      }
      goalIds.add(goal.id as string);
      return true;
    })
  ) {
    return false;
  }

  const rewardIds = new Set<string>();
  if (
    !value.rewards.every((reward) => {
      if (
        !isRecord(reward) ||
        !hasStringFields(reward, ["id", "accent", "emoji", "title"]) ||
        !rewardTypes.has(reward.type as string) ||
        !isInteger(reward.pointCost) ||
        rewardIds.has(reward.id as string)
      ) {
        return false;
      }
      rewardIds.add(reward.id as string);
      return true;
    }) ||
    !Object.entries(value.selectedRewardByChild as Record<string, string>).every(
      ([childId, rewardId]) => childIds.has(childId) && rewardIds.has(rewardId),
    )
  ) {
    return false;
  }

  if (
    !value.achievements.every(
      (achievement) =>
        isRecord(achievement) &&
        hasStringFields(achievement, [
          "id",
          "childId",
          "description",
          "earnedOn",
          "emoji",
          "title",
        ]) &&
        childIds.has(achievement.childId as string),
    ) ||
    !value.calendar.every(
      (item) =>
        isRecord(item) &&
        hasStringFields(item, ["id", "color", "icon", "timeLabel", "title"]) &&
        (item.childId === undefined || (isString(item.childId) && childIds.has(item.childId))),
    ) ||
    !value.completions.every(
      (completion) =>
        isRecord(completion) &&
        hasStringFields(completion, ["id", "childId", "goalId", "submittedAt"]) &&
        isOptionalString(completion.childNote) &&
        (completion.durationSeconds === undefined || isInteger(completion.durationSeconds)) &&
        childIds.has(completion.childId as string) &&
        goalIds.has(completion.goalId as string) &&
        completionStatuses.has(completion.status as string),
    ) ||
    !value.ledger.every(
      (entry) =>
        isRecord(entry) &&
        hasStringFields(entry, ["id", "childId", "idempotencyKey", "description", "occurredAt"]) &&
        isOptionalString(entry.reversesTransactionId) &&
        childIds.has(entry.childId as string) &&
        ledgerTypes.has(entry.type as string) &&
        isInteger(entry.amount, -MAX_INTEGER) &&
        entry.amount !== 0,
    ) ||
    !value.redemptions.every(
      (redemption) =>
        isRecord(redemption) &&
        hasStringFields(redemption, ["id", "childId", "rewardId"]) &&
        childIds.has(redemption.childId as string) &&
        rewardIds.has(redemption.rewardId as string) &&
        isInteger(redemption.pointCost) &&
        redemptionStatuses.has(redemption.status as string),
    )
  ) {
    return false;
  }

  if (!isNotificationPreferences(value.notificationPreferences)) {
    return false;
  }

  const onboarding = value.onboarding;
  if (
    !isBoundedArray(onboarding.completedSteps) ||
    !onboarding.completedSteps.every((step) => onboardingSteps.has(step as string)) ||
    !onboardingCurrentSteps.has(onboarding.currentStep as string) ||
    !onboardingStatuses.has(onboarding.status as string) ||
    (onboarding.status === "complete" &&
      ((value.familyName as string).length === 0 || childIds.size === 0)) ||
    (value.onboardingDraft !== null && !isOnboardingDraft(value.onboardingDraft))
  ) {
    return false;
  }

  const actor = value.activeActor;
  if (
    !hasStringFields(actor, ["id"]) ||
    !familyRoles.has(actor.role as string) ||
    (actor.permissions !== undefined && !isBooleanRecord(actor.permissions)) ||
    (actor.role === "child"
      ? !isString(actor.childId) || !childIds.has(actor.childId) || actor.id !== actor.childId
      : actor.childId !== undefined || actor.id !== value.adult.id)
  ) {
    return false;
  }

  const session = value.session;
  if (session.kind === "signed_out") return Object.keys(session).length === 1;
  if (!hasStringFields(session, ["actorId"])) return false;
  if (session.kind === "adult") {
    return (
      Object.keys(session).length === 2 &&
      !childRoles.has(actor.role as string) &&
      session.actorId === actor.id &&
      session.actorId === value.adult.id
    );
  }
  return (
    session.kind === "child" &&
    Object.keys(session).length === 3 &&
    actor.role === "child" &&
    isString(session.childId) &&
    childIds.has(session.childId) &&
    session.actorId === actor.id &&
    session.childId === actor.childId
  );
}

function isOnboardingDraft(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasStringFields(value, ["adultDisplayName", "familyName", "pointsName", "timezone"])
  ) {
    return false;
  }
  return (
    isNotificationPreferences(value.notificationPreferences) &&
    isBoundedArray(value.childDrafts) &&
    isBoundedArray(value.selectedStarterGoalIds) &&
    isBoundedArray(value.selectedStarterRewardIds) &&
    value.selectedStarterGoalIds.every(isString) &&
    value.selectedStarterRewardIds.every(isString) &&
    value.childDrafts.every((child) => OnboardingChildDraftSchema.safeParse(child).success)
  );
}

function isEnvelope(value: unknown): value is LocalFamilyEnvelopeV1 {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isInteger(value.nextSequence, 1) ||
    !isBoundedArray(value.offlineActions) ||
    !value.offlineActions.every(isOfflineAction) ||
    !isPinAttempts(value.pinAttempts) ||
    !isBoundedArray(value.processedCommandIds) ||
    !value.processedCommandIds.every(isString) ||
    new Set(value.processedCommandIds).size !== value.processedCommandIds.length ||
    !isSnapshot(value.snapshot)
  ) {
    return false;
  }

  const snapshot = value.snapshot;
  const childIds = new Set(snapshot.children.map((child) => child.id));
  const knownActorIds = new Set([snapshot.adult.id, ...childIds]);
  const offlineActions = value.offlineActions as readonly OfflineAction[];
  const processedCommandIds = value.processedCommandIds as readonly string[];
  const pinAttempts = value.pinAttempts as LocalFamilyEnvelopeV1["pinAttempts"];
  const ledgerIds = new Set(snapshot.ledger.map((entry) => entry.id));
  const ledgerIdempotencyKeys = new Set(snapshot.ledger.map((entry) => entry.idempotencyKey));

  if (
    !Object.keys(pinAttempts).every((childId) => childIds.has(childId)) ||
    !offlineActions.every((action) => knownActorIds.has(action.actorId)) ||
    new Set(offlineActions.map((action) => action.idempotencyKey)).size !== offlineActions.length ||
    ledgerIds.size !== snapshot.ledger.length ||
    ledgerIdempotencyKeys.size !== snapshot.ledger.length ||
    !snapshot.ledger.every((entry) => processedCommandIds.includes(entry.idempotencyKey))
  ) {
    return false;
  }

  try {
    return snapshot.children.every((child) => {
      const projection = reducePointLedger(
        snapshot.ledger.filter((entry) => entry.childId === child.id),
      );
      return projection.balance === child.points;
    });
  } catch {
    return false;
  }
}

function assertEnvelope(value: unknown): asserts value is LocalFamilyEnvelopeV1 {
  if (!isEnvelope(value)) throw isLocalEnvelopeError();
}

export function createMemoryStorage(
  initial: Readonly<Record<string, string>> = {},
): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

export async function readLocalEnvelope(
  storage: KeyValueStorage,
  seed: FamilySnapshot,
): Promise<LocalFamilyEnvelopeV1> {
  const serialized = await storage.getItem(STORAGE_KEY);
  if (!serialized) {
    const envelope: LocalFamilyEnvelopeV1 = {
      nextSequence: 1,
      offlineActions: [],
      pinAttempts: {},
      processedCommandIds: seed.ledger.map((entry) => entry.idempotencyKey),
      snapshot: structuredClone(seed),
      version: 1,
    };
    assertEnvelope(envelope);
    return envelope;
  }

  if (serialized.length > MAX_SERIALIZED_LENGTH) throw isLocalEnvelopeError();

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw isLocalEnvelopeError();
  }
  if (!isRecord(parsed) || parsed.version !== 1) {
    if (isRecord(parsed) && parsed.version !== 1) {
      throw new Error("Unsupported local family data. Reset the synthetic family to continue.");
    }
    throw isLocalEnvelopeError();
  }
  assertEnvelope(parsed);
  return structuredClone(parsed);
}

export async function writeLocalEnvelope(
  storage: KeyValueStorage,
  envelope: LocalFamilyEnvelopeV1,
): Promise<void> {
  assertEnvelope(envelope);
  let serialized: string;
  try {
    serialized = JSON.stringify(envelope);
  } catch {
    throw isLocalEnvelopeError();
  }
  if (serialized.length > MAX_SERIALIZED_LENGTH) throw isLocalEnvelopeError();
  await storage.setItem(STORAGE_KEY, serialized);
}
