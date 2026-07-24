import {
  type ApproveCompletionInput,
  type CommandContext,
  type CreateRewardInput,
  type DecideRedemptionInput,
  type FamilyRepository,
  type FamilySnapshot,
  type GoalSummary,
  type RedemptionSummary,
  type RewardSummary,
} from "@fovari/api-client";
import {
  can,
  reducePointLedger,
  requestRedemption as evaluateRedemption,
  type FamilyActor,
  type PointTransaction,
} from "@fovari/domain";
import {
  CreateChildSchema,
  CreateFamilySchema,
  CreateGoalSchema,
  RequestRedemptionSchema,
  SubmitCompletionSchema,
  type CreateChildInput,
  type CreateFamilyInput,
  type CreateGoalInput,
  type RequestRedemptionCommandInput,
  type SubmitCompletionInput,
} from "@fovari/validation";

const copy = <T>(value: T): T => structuredClone(value);

const commandMatches = (context: CommandContext, familyId: string, idempotencyKey: string) => {
  if (context.familyId !== familyId) {
    throw new Error("Command family does not match the active family");
  }
  if (context.idempotencyKey !== idempotencyKey) {
    throw new Error("Command idempotency key does not match the payload");
  }
};

export function createLocalFamilyRepository(seed: FamilySnapshot): FamilyRepository {
  let snapshot = copy(seed);
  let sequence = 1;
  const processedCommands = new Set(snapshot.ledger.map((entry) => entry.idempotencyKey));

  const nextId = () => `90000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;

  const actorFor = (actorId: string): FamilyActor => {
    if (snapshot.activeActor.id === actorId) {
      return snapshot.activeActor;
    }
    if (snapshot.children.some((child) => child.id === actorId)) {
      return { childId: actorId, id: actorId, role: "child" };
    }
    throw new Error("Actor is not part of this synthetic family");
  };

  const requireAdultPermission = (
    context: CommandContext,
    permission: Parameters<typeof can>[0],
  ) => {
    const actor = actorFor(context.actorId);
    if (!can(permission, actor)) {
      throw new Error(`Actor is not authorized to ${permission}`);
    }
    return actor;
  };

  const rejectDuplicate = (idempotencyKey: string) => {
    if (processedCommands.has(idempotencyKey)) {
      throw new Error("This command was already processed");
    }
  };

  const updateChildBalance = (childId: string) => {
    const childLedger = snapshot.ledger.filter((entry) => entry.childId === childId);
    const projection = reducePointLedger(childLedger);
    snapshot = {
      ...snapshot,
      children: snapshot.children.map((child) =>
        child.id === childId ? { ...child, points: projection.balance } : child,
      ),
    };
  };

  const appendTransaction = (entry: PointTransaction) => {
    const childEntries = snapshot.ledger.filter((item) => item.childId === entry.childId);
    reducePointLedger([...childEntries, entry]);
    snapshot = { ...snapshot, ledger: [...snapshot.ledger, entry] };
    updateChildBalance(entry.childId);
  };

  const result = (): FamilySnapshot => copy(snapshot);

  return {
    async approveCompletion(input: ApproveCompletionInput, context: CommandContext) {
      commandMatches(context, snapshot.familyId, context.idempotencyKey);
      requireAdultPermission(context, "approve_completions");
      rejectDuplicate(context.idempotencyKey);

      const completion = snapshot.completions.find((item) => item.id === input.completionId);
      if (!completion || completion.status !== "submitted") {
        throw new Error("Completion is not awaiting approval");
      }

      const goal = snapshot.goals.find((item) => item.id === completion.goalId);
      if (!goal) {
        throw new Error("Goal for completion was not found");
      }

      const pointsAwarded = input.pointsAwarded ?? goal.pointValue;
      if (!Number.isSafeInteger(pointsAwarded) || pointsAwarded < 0) {
        throw new Error("Approved points must be a non-negative safe integer");
      }

      if (pointsAwarded > 0) {
        appendTransaction({
          amount: pointsAwarded,
          childId: completion.childId,
          description: `Approved: ${goal.title}`,
          id: nextId(),
          idempotencyKey: context.idempotencyKey,
          occurredAt: new Date().toISOString(),
          type: "goal_reward",
        });
      }

      snapshot = {
        ...snapshot,
        children: snapshot.children.map((child) =>
          child.id === completion.childId
            ? { ...child, completedToday: Math.min(child.totalToday, child.completedToday + 1) }
            : child,
        ),
        completions: snapshot.completions.map((item) =>
          item.id === completion.id ? { ...item, status: "approved" } : item,
        ),
        goals: snapshot.goals.map((item) =>
          item.id === goal.id ? { ...item, status: "approved" } : item,
        ),
      };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async createChild(input: CreateChildInput, context: CommandContext) {
      const parsed = CreateChildSchema.parse(input);
      commandMatches(context, parsed.familyId, context.idempotencyKey);
      requireAdultPermission(context, "manage_privacy");
      rejectDuplicate(context.idempotencyKey);
      const childId = nextId();
      snapshot = {
        ...snapshot,
        children: [
          ...snapshot.children,
          {
            avatarKey: "new-child",
            completedToday: 0,
            experienceMode: parsed.experienceMode,
            id: childId,
            level: 1,
            name: parsed.displayName,
            points: 0,
            streakDays: 0,
            totalToday: 0,
          },
        ],
      };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async createFamily(input: CreateFamilyInput, context: CommandContext) {
      const parsed = CreateFamilySchema.parse(input);
      requireAdultPermission(context, "manage_privacy");
      rejectDuplicate(context.idempotencyKey);
      snapshot = { ...snapshot, familyName: parsed.name };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async createGoal(input: CreateGoalInput, context: CommandContext) {
      const parsed = CreateGoalSchema.parse(input);
      commandMatches(context, parsed.familyId, context.idempotencyKey);
      requireAdultPermission(context, "create_goals");
      rejectDuplicate(context.idempotencyKey);

      const additions: GoalSummary[] = parsed.childIds.map((childId) => ({
        category: parsed.category,
        childId,
        dueLabel: parsed.recurrenceRule ? "Recurring" : "Today",
        id: nextId(),
        instructions: parsed.instructions ?? "Follow the family instructions for this goal.",
        pointValue: parsed.pointValue,
        status: "ready",
        title: parsed.title,
        verification: parsed.goalType === "timed_session" ? "timer" : "parent",
      }));
      snapshot = { ...snapshot, goals: [...snapshot.goals, ...additions] };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async createReward(input: CreateRewardInput, context: CommandContext) {
      commandMatches(context, snapshot.familyId, context.idempotencyKey);
      requireAdultPermission(context, "manage_rewards");
      rejectDuplicate(context.idempotencyKey);
      if (!input.title.trim() || !Number.isSafeInteger(input.pointCost) || input.pointCost < 0) {
        throw new Error("Reward requires a title and non-negative point cost");
      }

      const reward: RewardSummary = {
        accent: "#E9E5FF",
        emoji: input.type === "experience" ? "🎟️" : "🎁",
        id: nextId(),
        pointCost: input.pointCost,
        title: input.title.trim(),
        type: input.type,
      };
      snapshot = { ...snapshot, rewards: [...snapshot.rewards, reward] };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async decideRedemption(input: DecideRedemptionInput, context: CommandContext) {
      commandMatches(context, snapshot.familyId, context.idempotencyKey);
      requireAdultPermission(context, "manage_rewards");
      rejectDuplicate(context.idempotencyKey);
      const redemption = snapshot.redemptions.find((item) => item.id === input.redemptionId);
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
        appendTransaction({
          amount: redemption.pointCost,
          childId: redemption.childId,
          description:
            input.decision === "refund" ? "Reward refund" : "Rejected reward request refund",
          id: nextId(),
          idempotencyKey: context.idempotencyKey,
          occurredAt: new Date().toISOString(),
          type: "refund",
        });
      }

      snapshot = {
        ...snapshot,
        redemptions: snapshot.redemptions.map((item) =>
          item.id === redemption.id ? { ...item, status: nextStatus } : item,
        ),
      };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async getSnapshot() {
      return result();
    },

    async requestRedemption(input: RequestRedemptionCommandInput, context: CommandContext) {
      const parsed = RequestRedemptionSchema.parse(input);
      commandMatches(context, parsed.familyId, parsed.idempotencyKey);
      rejectDuplicate(context.idempotencyKey);
      const actor = actorFor(context.actorId);
      if (actor.role === "child" && actor.childId !== parsed.childId) {
        throw new Error("A child may request a reward only for their own profile");
      }

      const reward = snapshot.rewards.find((item) => item.id === parsed.rewardId);
      const child = snapshot.children.find((item) => item.id === parsed.childId);
      if (!reward || !child) {
        throw new Error("Reward or child was not found");
      }

      const decision = evaluateRedemption({
        childId: child.id,
        currentBalance: child.points,
        idempotencyKey: context.idempotencyKey,
        priorRedemptionCount: snapshot.redemptions.filter(
          (item) =>
            item.childId === child.id &&
            item.rewardId === reward.id &&
            item.status !== "rejected" &&
            item.status !== "refunded",
        ).length,
        processedIdempotencyKeys: [...processedCommands],
        requestedAt: new Date().toISOString(),
        reward: {
          eligibleChildIds: snapshot.children.map((item) => item.id),
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

      appendTransaction({
        amount: -decision.value.snapshotPointCost,
        childId: child.id,
        description: `Reward requested: ${reward.title}`,
        id: nextId(),
        idempotencyKey: context.idempotencyKey,
        occurredAt: decision.value.requestedAt,
        type: "redemption",
      });

      snapshot = {
        ...snapshot,
        redemptions: [
          ...snapshot.redemptions,
          {
            childId: child.id,
            id: nextId(),
            pointCost: decision.value.snapshotPointCost,
            rewardId: reward.id,
            status: "requested",
          },
        ],
      };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async selectChild(childId: string) {
      if (!snapshot.children.some((child) => child.id === childId)) {
        throw new Error("Child profile was not found");
      }
      snapshot = { ...snapshot, activeChildId: childId };
      return result();
    },

    async selectReward(childId: string, rewardId: string) {
      if (!snapshot.children.some((child) => child.id === childId)) {
        throw new Error("Child profile was not found");
      }
      if (!snapshot.rewards.some((reward) => reward.id === rewardId)) {
        throw new Error("Reward was not found");
      }
      snapshot = {
        ...snapshot,
        selectedRewardByChild: { ...snapshot.selectedRewardByChild, [childId]: rewardId },
      };
      return result();
    },

    async submitCompletion(input: SubmitCompletionInput, context: CommandContext) {
      const parsed = SubmitCompletionSchema.parse(input);
      commandMatches(context, parsed.familyId, parsed.idempotencyKey);
      rejectDuplicate(context.idempotencyKey);
      const actor = actorFor(context.actorId);
      if (actor.role === "child" && actor.childId !== parsed.childId) {
        throw new Error("A child may submit only their own completion");
      }

      const goal = snapshot.goals.find(
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
        id: nextId(),
        status: "submitted" as const,
        submittedAt: new Date().toISOString(),
      };
      snapshot = {
        ...snapshot,
        completions: [...snapshot.completions, completion],
        goals: snapshot.goals.map((item) =>
          item.id === goal.id ? { ...item, status: "submitted" } : item,
        ),
      };
      processedCommands.add(context.idempotencyKey);
      return result();
    },

    async switchActor(actor: FamilyActor) {
      if (
        actor.role !== "child" &&
        actor.id !== snapshot.activeActor.id &&
        actor.role !== "family_owner"
      ) {
        throw new Error("Synthetic actor is not recognized");
      }
      snapshot = { ...snapshot, activeActor: copy(actor) };
      return result();
    },
  };
}
