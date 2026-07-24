import {
  type ApproveCompletionInput,
  type BeginFamilySetupInput,
  type ChildSummary,
  type CommandContext,
  type CompleteFamilySetupInput,
  type ConfigureChildPinInput,
  type CreateRewardInput,
  type DecideRedemptionInput,
  type FamilyRepository,
  type FamilySnapshot,
  type GoalSummary,
  type OnboardingDraft,
  type RedemptionSummary,
  type RewardSummary,
  type SaveOnboardingDraftInput,
  type UnlockChildInput,
} from "@fovari/api-client";
import {
  attemptChildUnlock,
  can,
  completeOnboardingStep,
  createOnboardingState,
  ONBOARDING_STEPS,
  reducePointLedger,
  requestRedemption as evaluateRedemption,
  type FamilyActor,
  type PointTransaction,
} from "@fovari/domain";
import {
  ConfigureChildPinSchema,
  CreateChildSchema,
  CreateFamilySchema,
  CreateGoalSchema,
  NotificationPreferencesSchema,
  OnboardingChildDraftSchema,
  RequestRedemptionSchema,
  SubmitCompletionSchema,
  UnlockChildSchema,
  type CreateChildInput,
  type CreateFamilyInput,
  type CreateGoalInput,
  type RequestRedemptionCommandInput,
  type SubmitCompletionInput,
} from "@fovari/validation";

import type { ChildPinVault } from "./child-pin-vault";
import { createDemoSeed } from "./fixtures";
import {
  type KeyValueStorage,
  type LocalFamilyEnvelopeV1,
  readLocalEnvelope,
  writeLocalEnvelope,
} from "./local-storage";
import { STARTER_GOALS, STARTER_REWARDS } from "./starter-content";

export interface LocalFamilyRepositoryOptions {
  now?: () => number;
  pinVault: ChildPinVault;
  seed: FamilySnapshot;
  storage: KeyValueStorage;
}

const copy = <T>(value: T): T => structuredClone(value);

const commandMatches = (context: CommandContext, familyId: string, idempotencyKey: string) => {
  if (context.familyId !== familyId) {
    throw new Error("Command family does not match the active family");
  }
  if (context.idempotencyKey !== idempotencyKey) {
    throw new Error("Command idempotency key does not match the payload");
  }
};

const createBlankFamilySeed = (existing: FamilySnapshot): FamilySnapshot => ({
  achievements: [],
  activeActor: { id: existing.adult.id, role: "family_owner" },
  activeChildId: "",
  adult: copy(existing.adult),
  calendar: [],
  children: [],
  completions: [],
  familyId: existing.familyId,
  familyName: "",
  goals: [],
  ledger: [],
  notificationPreferences: {
    approvalUpdates: true,
    childEncouragement: true,
    enabled: false,
    quietHoursEnd: "07:00",
    quietHoursStart: "20:00",
    weeklySummary: true,
  },
  onboarding: createOnboardingState(),
  onboardingDraft: null,
  pointsName: "Stars",
  redemptions: [],
  rewards: [],
  selectedRewardByChild: {},
  session: { actorId: existing.adult.id, kind: "adult" },
  timezone: "America/New_York",
});

const sanitizeOnboardingDraft = (draft: OnboardingDraft): OnboardingDraft => {
  const selectedStarterGoalIds = draft.selectedStarterGoalIds.map((id) => id.trim());
  const selectedStarterRewardIds = draft.selectedStarterRewardIds.map((id) => id.trim());
  if (
    selectedStarterGoalIds.some((id) => !id) ||
    selectedStarterRewardIds.some((id) => !id) ||
    new Set(selectedStarterGoalIds).size !== selectedStarterGoalIds.length ||
    new Set(selectedStarterRewardIds).size !== selectedStarterRewardIds.length
  ) {
    throw new Error("Starter content selections must use unique identifiers");
  }

  return {
    adultDisplayName: draft.adultDisplayName.trim(),
    childDrafts: draft.childDrafts.map((child) => OnboardingChildDraftSchema.parse(child)),
    familyName: draft.familyName.trim(),
    notificationPreferences: NotificationPreferencesSchema.parse(draft.notificationPreferences),
    pointsName: draft.pointsName.trim(),
    selectedStarterGoalIds,
    selectedStarterRewardIds,
    timezone: draft.timezone.trim(),
  };
};

const parseRequestedChildPins = (
  draft: OnboardingDraft,
  childPins: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> => {
  const knownClientIds = new Set(draft.childDrafts.map((child) => child.clientId));
  const unknownClientId = Object.keys(childPins).find((clientId) => !knownClientIds.has(clientId));
  if (unknownClientId) {
    throw new Error(`Unknown child PIN client ID: ${unknownClientId}`);
  }

  const parsedPins: Record<string, string> = {};
  for (const child of draft.childDrafts) {
    const hasPin = Object.prototype.hasOwnProperty.call(childPins, child.clientId);
    if (!child.pinRequested && hasPin) {
      throw new Error(`A PIN was not requested for ${child.clientId}`);
    }
    if (child.pinRequested && !hasPin) {
      throw new Error(`A PIN is required for ${child.clientId}`);
    }
    if (hasPin) {
      parsedPins[child.clientId] = ConfigureChildPinSchema.shape.pin.parse(
        childPins[child.clientId],
      );
    }
  }
  return parsedPins;
};

const createCompletedOnboardingState = () => {
  let onboarding = createOnboardingState();
  for (const step of ONBOARDING_STEPS) {
    const completed = completeOnboardingStep(onboarding, step);
    if (!completed.ok) throw new Error(completed.error.message);
    onboarding = completed.value;
  }
  return onboarding;
};

export function createLocalFamilyRepository(
  options: LocalFamilyRepositoryOptions,
): FamilyRepository {
  let envelope: LocalFamilyEnvelopeV1 | null = null;
  let hydration: Promise<void> | null = null;
  let mutationTail: Promise<void> = Promise.resolve();
  let reconciliation: Promise<void> | null = null;
  let reconciliationRequired = false;

  const ensureHydrated = async () => {
    if (!hydration) {
      const pending = readLocalEnvelope(options.storage, options.seed).then(async (loaded) => {
        envelope = loaded;
        await reconcileCredentialTransaction();
      });
      hydration = pending;
      try {
        await pending;
      } catch (error) {
        if (hydration === pending) hydration = null;
        throw error;
      }
    } else {
      await hydration;
    }

    if (!reconciliationRequired) return;
    const pending =
      reconciliation ??
      (async () => {
        envelope = await readLocalEnvelope(options.storage, options.seed);
        await reconcileCredentialTransaction();
        reconciliationRequired = false;
      })();
    reconciliation = pending;
    try {
      await pending;
    } finally {
      if (reconciliation === pending) reconciliation = null;
    }
  };

  const current = () => {
    if (!envelope) throw new Error("Local family repository is not hydrated");
    return envelope;
  };

  const envelopesEqual = (left: LocalFamilyEnvelopeV1, right: LocalFamilyEnvelopeV1) =>
    JSON.stringify(left) === JSON.stringify(right);

  const inconsistentEnvelopeWrite = (cause: unknown, detail: unknown) =>
    new AggregateError(
      [cause, detail],
      "Inconsistent local demo envelope state after ambiguous write.",
      { cause },
    );

  const commit = async (
    candidate: LocalFamilyEnvelopeV1,
    prior: LocalFamilyEnvelopeV1 = current(),
  ) => {
    const write = await writeLocalEnvelope(options.storage, candidate).then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ error, ok: false as const }),
    );
    if (write.ok) {
      envelope = candidate;
      return;
    }

    const readback = await readLocalEnvelope(options.storage, options.seed).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ error, ok: false as const }),
    );
    if (!readback.ok) {
      reconciliationRequired = true;
      throw inconsistentEnvelopeWrite(write.error, readback.error);
    }
    if (envelopesEqual(readback.value, candidate)) {
      envelope = candidate;
      return;
    }
    if (envelopesEqual(readback.value, prior)) {
      envelope = prior;
      throw write.error;
    }
    reconciliationRequired = true;
    throw inconsistentEnvelopeWrite(
      write.error,
      new Error("Envelope readback matched neither prior nor candidate state."),
    );
  };

  const clearPendingCredentialTransaction = (
    source: LocalFamilyEnvelopeV1,
  ): LocalFamilyEnvelopeV1 => {
    const candidate = copy(source);
    delete candidate.pendingCredentialTransactionId;
    return candidate;
  };

  const reconcileCredentialTransaction = async () => {
    const loaded = current();
    const marker = loaded.pendingCredentialTransactionId;
    const journal = await options.pinVault.getPendingTransactionId();
    if (marker !== undefined) {
      if (journal !== marker) {
        throw new Error("Inconsistent local demo credential transaction state.");
      }
      await options.pinVault.rollbackTransaction(marker);
      const cleared = clearPendingCredentialTransaction(loaded);
      await commit(cleared, loaded);
      await options.pinVault.finalizeTransaction(marker);
      return;
    }
    if (journal !== null) {
      await options.pinVault.finalizeTransaction(journal);
    }
  };

  const managedCredentialIds = async (candidate: LocalFamilyEnvelopeV1) => [
    ...new Set([
      ...candidate.snapshot.children.map((child) => child.id),
      ...(await options.pinVault.listManagedChildIds()),
    ]),
  ];

  const isAmbiguousEnvelopeError = (error: unknown) =>
    error instanceof AggregateError &&
    error.message === "Inconsistent local demo envelope state after ambiguous write.";

  const credentialTransactionError = (
    operation: string,
    cause: unknown,
    compensationCause: unknown,
  ) =>
    new AggregateError(
      [cause, compensationCause],
      `Inconsistent local demo credential state after failed ${operation}.`,
      { cause },
    );

  const runCredentialTransaction = async (
    candidate: LocalFamilyEnvelopeV1,
    credentialIds: readonly string[],
    operation: string,
    mutateVault: () => Promise<void>,
  ): Promise<FamilySnapshot> => {
    const prior = copy(current());
    const transactionId = await options.pinVault.beginTransaction(credentialIds);
    const marked: LocalFamilyEnvelopeV1 = {
      ...copy(prior),
      pendingCredentialTransactionId: transactionId,
    };

    try {
      await commit(marked, prior);
    } catch (cause) {
      if (isAmbiguousEnvelopeError(cause)) throw cause;
      const cleanup = await options.pinVault.finalizeTransaction(transactionId).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ error, ok: false as const }),
      );
      if (!cleanup.ok) {
        throw credentialTransactionError(operation, cause, cleanup.error);
      }
      throw cause;
    }

    try {
      await mutateVault();
      await commit(candidate, marked);
    } catch (cause) {
      if (isAmbiguousEnvelopeError(cause)) throw cause;
      const rollback = await options.pinVault.rollbackTransaction(transactionId).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ error, ok: false as const }),
      );
      if (!rollback.ok) {
        throw credentialTransactionError(operation, cause, rollback.error);
      }
      const envelopeRollback = await commit(prior, marked).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ error, ok: false as const }),
      );
      if (!envelopeRollback.ok) {
        throw credentialTransactionError(operation, cause, envelopeRollback.error);
      }
      const cleanup = await options.pinVault.finalizeTransaction(transactionId).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ error, ok: false as const }),
      );
      if (!cleanup.ok) {
        throw credentialTransactionError(operation, cause, cleanup.error);
      }
      throw cause;
    }

    await options.pinVault.finalizeTransaction(transactionId);
    return copy(candidate.snapshot);
  };

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationTail.then(operation, operation);
    mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const mutate = (operation: (candidate: LocalFamilyEnvelopeV1) => Promise<void> | void) =>
    serialize(async () => {
      await ensureHydrated();
      const candidate = copy(current());
      await operation(candidate);
      await commit(candidate);
      return copy(candidate.snapshot);
    });

  const nextId = (candidate: LocalFamilyEnvelopeV1) => {
    const value = candidate.nextSequence;
    candidate.nextSequence += 1;
    return `90000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
  };

  const actorFor = (candidate: LocalFamilyEnvelopeV1, actorId: string): FamilyActor => {
    const session = candidate.snapshot.session;
    if (session.kind === "signed_out" || session.actorId !== actorId) {
      throw new Error("Actor does not match the active synthetic session");
    }
    if (candidate.snapshot.activeActor.id !== actorId) {
      throw new Error("Active actor does not match the active synthetic session");
    }
    if (
      session.kind === "child" &&
      (candidate.snapshot.activeActor.role !== "child" ||
        candidate.snapshot.activeActor.childId !== session.childId ||
        session.childId !== actorId)
    ) {
      throw new Error("Active actor does not match the active synthetic session");
    }
    if (session.kind === "adult" && candidate.snapshot.activeActor.role === "child") {
      throw new Error("Active actor does not match the active synthetic session");
    }
    return candidate.snapshot.activeActor;
  };

  const requireAdultPermission = (
    candidate: LocalFamilyEnvelopeV1,
    context: CommandContext,
    permission: Parameters<typeof can>[0],
  ) => {
    const actor = actorFor(candidate, context.actorId);
    if (!can(permission, actor)) {
      throw new Error(`Actor is not authorized to ${permission}`);
    }
    return actor;
  };

  const rejectDuplicate = (candidate: LocalFamilyEnvelopeV1, idempotencyKey: string) => {
    if (candidate.processedCommandIds.includes(idempotencyKey)) {
      throw new Error("This command was already processed");
    }
  };

  const markProcessed = (candidate: LocalFamilyEnvelopeV1, idempotencyKey: string) => {
    candidate.processedCommandIds = [...candidate.processedCommandIds, idempotencyKey];
  };

  const updateChildBalance = (candidate: LocalFamilyEnvelopeV1, childId: string) => {
    const childLedger = candidate.snapshot.ledger.filter((entry) => entry.childId === childId);
    const projection = reducePointLedger(childLedger);
    candidate.snapshot = {
      ...candidate.snapshot,
      children: candidate.snapshot.children.map((child) =>
        child.id === childId ? { ...child, points: projection.balance } : child,
      ),
    };
  };

  const appendTransaction = (candidate: LocalFamilyEnvelopeV1, entry: PointTransaction) => {
    if (
      candidate.snapshot.ledger.some(
        (item) => item.id === entry.id || item.idempotencyKey === entry.idempotencyKey,
      )
    ) {
      throw new Error("Point transaction identity must be unique across the family");
    }
    const childEntries = candidate.snapshot.ledger.filter((item) => item.childId === entry.childId);
    reducePointLedger([...childEntries, entry]);
    candidate.snapshot = {
      ...candidate.snapshot,
      ledger: [...candidate.snapshot.ledger, entry],
    };
    updateChildBalance(candidate, entry.childId);
  };

  const nowIso = () => new Date(options.now?.() ?? Date.now()).toISOString();

  return {
    async approveCompletion(input: ApproveCompletionInput, context: CommandContext) {
      return mutate((candidate) => {
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "approve_completions");
        rejectDuplicate(candidate, context.idempotencyKey);

        const completion = candidate.snapshot.completions.find(
          (item) => item.id === input.completionId,
        );
        if (!completion || completion.status !== "submitted") {
          throw new Error("Completion is not awaiting approval");
        }

        const goal = candidate.snapshot.goals.find((item) => item.id === completion.goalId);
        if (!goal) {
          throw new Error("Goal for completion was not found");
        }

        const pointsAwarded = input.pointsAwarded ?? goal.pointValue;
        if (!Number.isSafeInteger(pointsAwarded) || pointsAwarded < 0) {
          throw new Error("Approved points must be a non-negative safe integer");
        }

        if (pointsAwarded > 0) {
          appendTransaction(candidate, {
            amount: pointsAwarded,
            childId: completion.childId,
            description: `Approved: ${goal.title}`,
            id: nextId(candidate),
            idempotencyKey: context.idempotencyKey,
            occurredAt: nowIso(),
            type: "goal_reward",
          });
        }

        candidate.snapshot = {
          ...candidate.snapshot,
          children: candidate.snapshot.children.map((child) =>
            child.id === completion.childId
              ? {
                  ...child,
                  completedToday: Math.min(child.totalToday, child.completedToday + 1),
                }
              : child,
          ),
          completions: candidate.snapshot.completions.map((item) =>
            item.id === completion.id ? { ...item, status: "approved" } : item,
          ),
          goals: candidate.snapshot.goals.map((item) =>
            item.id === goal.id ? { ...item, status: "approved" } : item,
          ),
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async beginFamilySetup(input: BeginFamilySetupInput, context: CommandContext) {
      return serialize(async () => {
        await ensureHydrated();
        const candidate = copy(current());
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);
        const adultDisplayName = input.adultDisplayName.trim();
        if (!adultDisplayName) throw new Error("Adult display name is required");

        const credentialIds = await managedCredentialIds(candidate);
        candidate.offlineActions = [];
        candidate.pinAttempts = {};
        candidate.snapshot = {
          ...createBlankFamilySeed(candidate.snapshot),
          adult: { displayName: adultDisplayName, id: context.actorId },
          activeActor: { id: context.actorId, role: "family_owner" },
          onboarding: createOnboardingState(),
          session: { actorId: context.actorId, kind: "adult" },
        };
        markProcessed(candidate, context.idempotencyKey);
        return runCredentialTransaction(
          candidate,
          credentialIds,
          "family setup replacement",
          async () => {
            for (const childId of credentialIds) {
              await options.pinVault.remove(childId);
            }
          },
        );
      });
    },

    async completeFamilySetup(input: CompleteFamilySetupInput, context: CommandContext) {
      return serialize(async () => {
        await ensureHydrated();
        const candidate = copy(current());
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);

        const draft = sanitizeOnboardingDraft(input.draft);
        if (!draft.adultDisplayName) throw new Error("Adult display name is required");
        if (draft.childDrafts.length === 0) throw new Error("At least one child is required");
        const family = CreateFamilySchema.parse({
          name: draft.familyName,
          pointsName: draft.pointsName,
          timezone: draft.timezone,
        });

        const clientIds = draft.childDrafts.map((child) => child.clientId);
        if (new Set(clientIds).size !== clientIds.length) {
          throw new Error("Child draft identifiers must be unique");
        }
        const parsedChildPins = parseRequestedChildPins(draft, input.childPins);

        const unknownStarterGoalId = draft.selectedStarterGoalIds.find(
          (id) => !STARTER_GOALS.some((goal) => goal.id === id),
        );
        const unknownStarterRewardId = draft.selectedStarterRewardIds.find(
          (id) => !STARTER_REWARDS.some((reward) => reward.id === id),
        );
        if (unknownStarterGoalId) {
          throw new Error(`Unknown starter goal: ${unknownStarterGoalId}`);
        }
        if (unknownStarterRewardId) {
          throw new Error(`Unknown starter reward: ${unknownStarterRewardId}`);
        }

        const selectedGoalDefinitions = STARTER_GOALS.filter((goal) =>
          draft.selectedStarterGoalIds.includes(goal.id),
        );
        const children: ChildSummary[] = draft.childDrafts.map((childDraft) => ({
          avatarKey: childDraft.experienceMode,
          completedToday: 0,
          experienceMode: childDraft.experienceMode,
          id: nextId(candidate),
          level: 1,
          name: childDraft.displayName,
          pinConfigured: Object.prototype.hasOwnProperty.call(parsedChildPins, childDraft.clientId),
          points: 0,
          streakDays: 0,
          totalToday: selectedGoalDefinitions.length,
        }));

        const goals: GoalSummary[] = children.flatMap((child) =>
          selectedGoalDefinitions.map((goal) => ({
            category: goal.category,
            childId: child.id,
            dueLabel: "Daily",
            id: nextId(candidate),
            instructions: goal.instructions,
            pointValue: goal.pointValue,
            status: "ready",
            title: goal.title,
            verification: "parent",
          })),
        );

        const rewards: RewardSummary[] = STARTER_REWARDS.filter((reward) =>
          draft.selectedStarterRewardIds.includes(reward.id),
        ).map((reward) => ({
          accent: "#E9E5FF",
          emoji: reward.emoji,
          id: nextId(candidate),
          pointCost: reward.pointCost,
          title: reward.title,
          type: reward.type,
        }));

        const selectedRewardByChild =
          rewards[0] === undefined
            ? {}
            : Object.fromEntries(children.map((child) => [child.id, rewards[0]!.id]));

        const childIdToClientId = Object.fromEntries(
          children.map((child, index) => [child.id, draft.childDrafts[index]!.clientId]),
        );
        const credentialIds = await managedCredentialIds(candidate);
        candidate.pinAttempts = {};
        candidate.snapshot = {
          ...candidate.snapshot,
          achievements: [],
          activeActor: { id: context.actorId, role: "family_owner" },
          activeChildId: children[0]!.id,
          adult: {
            displayName: draft.adultDisplayName,
            id: context.actorId,
          },
          calendar: [],
          children,
          completions: [],
          familyName: family.name,
          goals,
          ledger: [],
          notificationPreferences: copy(draft.notificationPreferences),
          onboarding: createCompletedOnboardingState(),
          onboardingDraft: null,
          pointsName: family.pointsName,
          redemptions: [],
          rewards,
          selectedRewardByChild,
          session: { actorId: context.actorId, kind: "adult" },
          timezone: family.timezone,
        };
        markProcessed(candidate, context.idempotencyKey);
        return runCredentialTransaction(
          candidate,
          [...credentialIds, ...children.map((child) => child.id)],
          "family setup completion",
          async () => {
            for (const childId of credentialIds) {
              await options.pinVault.remove(childId);
            }
            for (const child of children) {
              const clientId = childIdToClientId[child.id];
              const pin = clientId ? parsedChildPins[clientId] : undefined;
              if (!pin) continue;
              await options.pinVault.set(child.id, pin);
            }
          },
        );
      });
    },

    async configureChildPin(input: ConfigureChildPinInput, context: CommandContext) {
      return serialize(async () => {
        await ensureHydrated();
        const candidate = copy(current());
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);
        const parsed = ConfigureChildPinSchema.parse(input);
        const child = candidate.snapshot.children.find((item) => item.id === parsed.childId);
        if (!child) throw new Error("Child profile was not found");

        candidate.snapshot = {
          ...candidate.snapshot,
          children: candidate.snapshot.children.map((item) =>
            item.id === child.id ? { ...item, pinConfigured: true } : item,
          ),
        };
        markProcessed(candidate, context.idempotencyKey);
        return runCredentialTransaction(candidate, [child.id], "child PIN configuration", () =>
          options.pinVault.set(child.id, parsed.pin),
        );
      });
    },

    async createChild(input: CreateChildInput, context: CommandContext) {
      return mutate((candidate) => {
        const parsed = CreateChildSchema.parse(input);
        commandMatches(context, parsed.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);
        const childId = nextId(candidate);
        candidate.snapshot = {
          ...candidate.snapshot,
          activeChildId: candidate.snapshot.activeChildId || childId,
          children: [
            ...candidate.snapshot.children,
            {
              avatarKey: "new-child",
              completedToday: 0,
              experienceMode: parsed.experienceMode,
              id: childId,
              level: 1,
              name: parsed.displayName,
              pinConfigured: false,
              points: 0,
              streakDays: 0,
              totalToday: 0,
            },
          ],
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async createFamily(input: CreateFamilyInput, context: CommandContext) {
      return mutate((candidate) => {
        const parsed = CreateFamilySchema.parse(input);
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);
        candidate.snapshot = {
          ...candidate.snapshot,
          familyName: parsed.name,
          pointsName: parsed.pointsName,
          timezone: parsed.timezone,
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async createGoal(input: CreateGoalInput, context: CommandContext) {
      return mutate((candidate) => {
        const parsed = CreateGoalSchema.parse(input);
        commandMatches(context, parsed.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "create_goals");
        rejectDuplicate(candidate, context.idempotencyKey);

        const additions: GoalSummary[] = parsed.childIds.map((childId) => ({
          category: parsed.category,
          childId,
          dueLabel: parsed.recurrenceRule ? "Recurring" : "Today",
          id: nextId(candidate),
          instructions: parsed.instructions ?? "Follow the family instructions for this goal.",
          pointValue: parsed.pointValue,
          status: "ready",
          title: parsed.title,
          verification: parsed.goalType === "timed_session" ? "timer" : "parent",
        }));
        candidate.snapshot = {
          ...candidate.snapshot,
          goals: [...candidate.snapshot.goals, ...additions],
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async createReward(input: CreateRewardInput, context: CommandContext) {
      return mutate((candidate) => {
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_rewards");
        rejectDuplicate(candidate, context.idempotencyKey);
        if (!input.title.trim() || !Number.isSafeInteger(input.pointCost) || input.pointCost < 0) {
          throw new Error("Reward requires a title and non-negative point cost");
        }

        const reward: RewardSummary = {
          accent: "#E9E5FF",
          emoji: input.type === "experience" ? "\u{1F39F}\u{FE0F}" : "\u{1F381}",
          id: nextId(candidate),
          pointCost: input.pointCost,
          title: input.title.trim(),
          type: input.type,
        };
        candidate.snapshot = {
          ...candidate.snapshot,
          rewards: [...candidate.snapshot.rewards, reward],
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async decideRedemption(input: DecideRedemptionInput, context: CommandContext) {
      return mutate((candidate) => {
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_rewards");
        rejectDuplicate(candidate, context.idempotencyKey);
        const redemption = candidate.snapshot.redemptions.find(
          (item) => item.id === input.redemptionId,
        );
        if (!redemption) {
          throw new Error("Reward request was not found");
        }

        const allowed: Record<DecideRedemptionInput["decision"], RedemptionSummary["status"][]> = {
          approve: ["requested"],
          fulfill: ["approved", "scheduled"],
          refund: ["fulfilled"],
          reject: ["requested", "approved"],
          schedule: ["requested", "approved"],
        };
        if (!allowed[input.decision].includes(redemption.status)) {
          throw new Error(`Cannot ${input.decision} a ${redemption.status} reward request`);
        }

        const nextStatus: RedemptionSummary["status"] =
          input.decision === "approve"
            ? "approved"
            : input.decision === "fulfill"
              ? "fulfilled"
              : input.decision === "schedule"
                ? "scheduled"
                : input.decision === "refund"
                  ? "refunded"
                  : "rejected";

        if (input.decision === "refund" || input.decision === "reject") {
          appendTransaction(candidate, {
            amount: redemption.pointCost,
            childId: redemption.childId,
            description:
              input.decision === "refund" ? "Reward refund" : "Rejected reward request refund",
            id: nextId(candidate),
            idempotencyKey: context.idempotencyKey,
            occurredAt: nowIso(),
            type: "refund",
          });
        }

        candidate.snapshot = {
          ...candidate.snapshot,
          redemptions: candidate.snapshot.redemptions.map((item) =>
            item.id === redemption.id ? { ...item, status: nextStatus } : item,
          ),
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async getSnapshot() {
      await ensureHydrated();
      await mutationTail;
      await ensureHydrated();
      return copy(current().snapshot);
    },

    async requestRedemption(input: RequestRedemptionCommandInput, context: CommandContext) {
      return mutate((candidate) => {
        const parsed = RequestRedemptionSchema.parse(input);
        commandMatches(context, parsed.familyId, parsed.idempotencyKey);
        rejectDuplicate(candidate, context.idempotencyKey);
        const actor = actorFor(candidate, context.actorId);
        if (actor.role === "child" && actor.childId !== parsed.childId) {
          throw new Error("A child may request a reward only for their own profile");
        }

        const reward = candidate.snapshot.rewards.find((item) => item.id === parsed.rewardId);
        const child = candidate.snapshot.children.find((item) => item.id === parsed.childId);
        if (!reward || !child) {
          throw new Error("Reward or child was not found");
        }

        const decision = evaluateRedemption({
          childId: child.id,
          currentBalance: child.points,
          idempotencyKey: context.idempotencyKey,
          priorRedemptionCount: candidate.snapshot.redemptions.filter(
            (item) =>
              item.childId === child.id &&
              item.rewardId === reward.id &&
              item.status !== "rejected" &&
              item.status !== "refunded",
          ).length,
          processedIdempotencyKeys: candidate.processedCommandIds,
          requestedAt: nowIso(),
          reward: {
            eligibleChildIds: candidate.snapshot.children.map((item) => item.id),
            id: reward.id,
            isActive: true,
            maxRedemptionsPerChild: 3,
            pointCost: reward.pointCost,
            title: reward.title,
          },
        });
        if (!decision.ok) {
          throw new Error(decision.error.message);
        }

        appendTransaction(candidate, {
          amount: -decision.value.snapshotPointCost,
          childId: child.id,
          description: `Reward requested: ${reward.title}`,
          id: nextId(candidate),
          idempotencyKey: context.idempotencyKey,
          occurredAt: decision.value.requestedAt,
          type: "redemption",
        });

        candidate.snapshot = {
          ...candidate.snapshot,
          redemptions: [
            ...candidate.snapshot.redemptions,
            {
              childId: child.id,
              id: nextId(candidate),
              pointCost: decision.value.snapshotPointCost,
              rewardId: reward.id,
              status: "requested",
            },
          ],
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async resetDemo(context: CommandContext) {
      return serialize(async () => {
        await ensureHydrated();
        const candidate = copy(current());
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        const credentialIds = await managedCredentialIds(candidate);

        const seed = createDemoSeed();
        candidate.nextSequence = 1;
        candidate.offlineActions = [];
        candidate.pinAttempts = {};
        candidate.processedCommandIds = seed.ledger.map((entry) => entry.idempotencyKey);
        candidate.snapshot = seed;
        return runCredentialTransaction(candidate, credentialIds, "demo reset", async () => {
          for (const childId of credentialIds) {
            await options.pinVault.remove(childId);
          }
        });
      });
    },

    async saveOnboardingDraft(input: SaveOnboardingDraftInput, context: CommandContext) {
      return mutate((candidate) => {
        commandMatches(context, candidate.snapshot.familyId, context.idempotencyKey);
        requireAdultPermission(candidate, context, "manage_privacy");
        rejectDuplicate(candidate, context.idempotencyKey);
        candidate.snapshot = {
          ...candidate.snapshot,
          onboarding: copy(input.onboarding),
          onboardingDraft: sanitizeOnboardingDraft(input.draft),
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async selectChild(childId: string) {
      return mutate((candidate) => {
        if (!candidate.snapshot.children.some((child) => child.id === childId)) {
          throw new Error("Child profile was not found");
        }
        candidate.snapshot = { ...candidate.snapshot, activeChildId: childId };
      });
    },

    async selectReward(childId: string, rewardId: string) {
      return mutate((candidate) => {
        if (!candidate.snapshot.children.some((child) => child.id === childId)) {
          throw new Error("Child profile was not found");
        }
        if (!candidate.snapshot.rewards.some((reward) => reward.id === rewardId)) {
          throw new Error("Reward was not found");
        }
        candidate.snapshot = {
          ...candidate.snapshot,
          selectedRewardByChild: {
            ...candidate.snapshot.selectedRewardByChild,
            [childId]: rewardId,
          },
        };
      });
    },

    async signInAdult() {
      return mutate((candidate) => {
        candidate.snapshot = {
          ...candidate.snapshot,
          activeActor: { id: candidate.snapshot.adult.id, role: "family_owner" },
          session: { actorId: candidate.snapshot.adult.id, kind: "adult" },
        };
      });
    },

    async signOut() {
      return mutate((candidate) => {
        candidate.snapshot = {
          ...candidate.snapshot,
          session: { kind: "signed_out" },
        };
      });
    },

    async submitCompletion(input: SubmitCompletionInput, context: CommandContext) {
      return mutate((candidate) => {
        const parsed = SubmitCompletionSchema.parse(input);
        commandMatches(context, parsed.familyId, parsed.idempotencyKey);
        rejectDuplicate(candidate, context.idempotencyKey);
        const actor = actorFor(candidate, context.actorId);
        if (actor.role === "child" && actor.childId !== parsed.childId) {
          throw new Error("A child may submit only their own completion");
        }

        const goal = candidate.snapshot.goals.find(
          (item) => item.id === parsed.occurrenceId && item.childId === parsed.childId,
        );
        if (!goal || goal.status !== "ready") {
          throw new Error("Goal is not available for completion");
        }

        const completion = {
          ...(parsed.childNote ? { childNote: parsed.childNote } : {}),
          ...(parsed.durationSeconds !== undefined
            ? { durationSeconds: parsed.durationSeconds }
            : {}),
          childId: parsed.childId,
          goalId: goal.id,
          id: nextId(candidate),
          status: "submitted" as const,
          submittedAt: nowIso(),
        };
        candidate.snapshot = {
          ...candidate.snapshot,
          completions: [...candidate.snapshot.completions, completion],
          goals: candidate.snapshot.goals.map((item) =>
            item.id === goal.id ? { ...item, status: "submitted" } : item,
          ),
        };
        markProcessed(candidate, context.idempotencyKey);
      });
    },

    async switchActor(actor: FamilyActor) {
      return mutate((candidate) => {
        const child =
          actor.role === "child"
            ? candidate.snapshot.children.find((item) => item.id === actor.childId)
            : undefined;
        const isKnownChild = actor.role === "child" && actor.childId === actor.id && child;
        const isKnownAdult = actor.role !== "child" && actor.id === candidate.snapshot.adult.id;
        if (!isKnownChild && !isKnownAdult) {
          throw new Error("Synthetic actor is not recognized");
        }
        if (child?.pinConfigured) {
          throw new Error("Use child PIN unlock for this profile");
        }
        candidate.snapshot = {
          ...candidate.snapshot,
          activeActor: copy(actor),
          session:
            actor.role === "child"
              ? { actorId: actor.id, childId: actor.childId!, kind: "child" }
              : { actorId: actor.id, kind: "adult" },
        };
      });
    },

    async unlockChild(input: UnlockChildInput) {
      return serialize(async () => {
        await ensureHydrated();
        const candidate = copy(current());
        const parsed = UnlockChildSchema.parse(input);
        const child = candidate.snapshot.children.find((item) => item.id === parsed.childId);
        if (!child) throw new Error("Child profile was not found");
        const prior = candidate.pinAttempts[child.id] ?? { failures: 0 };
        const matches = child.pinConfigured
          ? await options.pinVault.verify(child.id, parsed.pin ?? "")
          : true;
        const decision = attemptChildUnlock({
          configured: child.pinConfigured,
          failures: prior.failures,
          ...(prior.lockedUntil === undefined ? {} : { lockedUntil: prior.lockedUntil }),
          matches,
          now: parsed.now,
        });
        candidate.pinAttempts = {
          ...candidate.pinAttempts,
          [child.id]: {
            failures: decision.failures,
            ...(!decision.ok && decision.lockedUntil !== undefined
              ? { lockedUntil: decision.lockedUntil }
              : {}),
          },
        };
        if (!decision.ok) {
          await commit(candidate);
          if (decision.lockedUntil !== undefined) {
            throw new Error(`Profile locked until ${new Date(decision.lockedUntil).toISOString()}`);
          }
          throw new Error(`That PIN does not match. ${decision.remainingAttempts} tries left.`);
        }
        candidate.snapshot = {
          ...candidate.snapshot,
          activeActor: { childId: child.id, id: child.id, role: "child" },
          activeChildId: child.id,
          session: { actorId: child.id, childId: child.id, kind: "child" },
        };
        await commit(candidate);
        return copy(candidate.snapshot);
      });
    },
  };
}
