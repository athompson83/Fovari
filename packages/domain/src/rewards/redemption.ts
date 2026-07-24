import { err, ok, type Result } from "../shared/result";

export interface RewardPolicy {
  id: string;
  title: string;
  pointCost: number;
  isActive: boolean;
  eligibleChildIds?: readonly string[];
  maxRedemptionsPerChild?: number;
}

export interface RequestRedemptionInput {
  childId: string;
  currentBalance: number;
  idempotencyKey: string;
  priorRedemptionCount: number;
  processedIdempotencyKeys?: readonly string[];
  requestedAt: string;
  reward: RewardPolicy;
}

export interface RedemptionDecision {
  balanceAfter: number;
  childId: string;
  idempotencyKey: string;
  requestedAt: string;
  rewardId: string;
  snapshotPointCost: number;
  status: "requested";
}

export type RedemptionErrorCode =
  | "duplicate_command"
  | "insufficient_points"
  | "not_eligible"
  | "redemption_limit"
  | "reward_unavailable";

export interface RedemptionError {
  code: RedemptionErrorCode;
  message: string;
}

const failure = (
  code: RedemptionErrorCode,
  message: string,
): Result<RedemptionDecision, RedemptionError> => err({ code, message });

export function requestRedemption(
  input: RequestRedemptionInput,
): Result<RedemptionDecision, RedemptionError> {
  const { reward } = input;

  if (!reward.isActive || !Number.isSafeInteger(reward.pointCost) || reward.pointCost < 0) {
    return failure("reward_unavailable", "This reward is not currently available.");
  }

  if (reward.eligibleChildIds && !reward.eligibleChildIds.includes(input.childId)) {
    return failure("not_eligible", "This reward is not available for this child.");
  }

  if (
    reward.maxRedemptionsPerChild !== undefined &&
    input.priorRedemptionCount >= reward.maxRedemptionsPerChild
  ) {
    return failure("redemption_limit", "This reward has reached its redemption limit.");
  }

  if (input.processedIdempotencyKeys?.includes(input.idempotencyKey)) {
    return failure("duplicate_command", "This reward request was already processed.");
  }

  if (input.currentBalance < reward.pointCost) {
    return failure("insufficient_points", "There are not enough points for this reward.");
  }

  return ok({
    balanceAfter: input.currentBalance - reward.pointCost,
    childId: input.childId,
    idempotencyKey: input.idempotencyKey,
    requestedAt: input.requestedAt,
    rewardId: reward.id,
    snapshotPointCost: reward.pointCost,
    status: "requested",
  });
}
