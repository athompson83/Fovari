import { describe, expect, it } from "vitest";

import { requestRedemption, type RewardPolicy } from "./redemption";

const reward: RewardPolicy = {
  eligibleChildIds: ["child-alex"],
  id: "reward-movie",
  isActive: true,
  maxRedemptionsPerChild: 2,
  pointCost: 100,
  title: "Movie night",
};

describe("requestRedemption", () => {
  it("snapshots the cost and calculates the confirmed remaining balance", () => {
    expect(
      requestRedemption({
        childId: "child-alex",
        currentBalance: 240,
        idempotencyKey: "request-1",
        priorRedemptionCount: 0,
        requestedAt: "2026-07-24T14:00:00.000Z",
        reward,
      }),
    ).toEqual({
      ok: true,
      value: {
        balanceAfter: 140,
        childId: "child-alex",
        idempotencyKey: "request-1",
        requestedAt: "2026-07-24T14:00:00.000Z",
        rewardId: "reward-movie",
        snapshotPointCost: 100,
        status: "requested",
      },
    });
  });

  it("rejects a request that would overdraw the child account", () => {
    const result = requestRedemption({
      childId: "child-alex",
      currentBalance: 50,
      idempotencyKey: "request-2",
      priorRedemptionCount: 0,
      requestedAt: "2026-07-24T14:00:00.000Z",
      reward,
    });

    expect(result).toMatchObject({ error: { code: "insufficient_points" }, ok: false });
  });

  it("rejects inactive, ineligible, limited, and duplicate requests", () => {
    const base = {
      childId: "child-alex",
      currentBalance: 240,
      idempotencyKey: "request-3",
      priorRedemptionCount: 0,
      processedIdempotencyKeys: [] as string[],
      requestedAt: "2026-07-24T14:00:00.000Z",
      reward,
    };

    expect(requestRedemption({ ...base, reward: { ...reward, isActive: false } })).toMatchObject({
      error: { code: "reward_unavailable" },
      ok: false,
    });
    expect(requestRedemption({ ...base, childId: "child-sam" })).toMatchObject({
      error: { code: "not_eligible" },
      ok: false,
    });
    expect(requestRedemption({ ...base, priorRedemptionCount: 2 })).toMatchObject({
      error: { code: "redemption_limit" },
      ok: false,
    });
    expect(requestRedemption({ ...base, processedIdempotencyKeys: ["request-3"] })).toMatchObject({
      error: { code: "duplicate_command" },
      ok: false,
    });
  });
});
