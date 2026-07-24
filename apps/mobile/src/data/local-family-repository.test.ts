import { describe, expect, it } from "vitest";

import { createCommandContext } from "@fovari/api-client";

import { DEMO_IDS, createDemoSeed } from "./fixtures";
import { createLocalFamilyRepository } from "./local-family-repository";

describe("LocalFamilyRepository", () => {
  it("submits and approves a completion with exactly one immutable point credit", async () => {
    const repository = createLocalFamilyRepository(createDemoSeed());
    const initial = await repository.getSnapshot();
    const initialPoints = initial.children.find((child) => child.id === DEMO_IDS.alex)!.points;

    const submitted = await repository.submitCompletion(
      {
        childId: DEMO_IDS.alex,
        childNote: "I finished two chapters.",
        durationSeconds: 1_260,
        evidence: [],
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-reading-1",
        occurrenceId: DEMO_IDS.readingGoal,
      },
      createCommandContext({
        actorId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-reading-1",
      }),
    );

    const completion = submitted.completions.at(-1)!;
    expect(completion.status).toBe("submitted");
    expect(submitted.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints,
    );

    const approved = await repository.approveCompletion(
      { completionId: completion.id, parentNote: "Great consistency!" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "approve-reading-1",
      }),
    );

    expect(approved.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints + 15,
    );
    expect(
      approved.ledger.filter((entry) => entry.idempotencyKey === "approve-reading-1"),
    ).toHaveLength(1);

    await expect(
      repository.approveCompletion(
        { completionId: completion.id },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "approve-reading-duplicate",
        }),
      ),
    ).rejects.toThrow("awaiting approval");
  });

  it("debits once for a reward request and preserves history through fulfillment and refund", async () => {
    const repository = createLocalFamilyRepository(createDemoSeed());
    const initial = await repository.getSnapshot();
    const initialPoints = initial.children.find((child) => child.id === DEMO_IDS.alex)!.points;

    const requested = await repository.requestRedemption(
      {
        childId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "request-movie-1",
        rewardId: DEMO_IDS.movieReward,
      },
      createCommandContext({
        actorId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "request-movie-1",
      }),
    );

    const redemption = requested.redemptions.at(-1)!;
    expect(requested.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints - 100,
    );

    await repository.decideRedemption(
      { decision: "approve", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "approve-movie-1",
      }),
    );
    const fulfilled = await repository.decideRedemption(
      { decision: "fulfill", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "fulfill-movie-1",
      }),
    );
    expect(fulfilled.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints - 100,
    );

    const refunded = await repository.decideRedemption(
      { decision: "refund", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "refund-movie-1",
      }),
    );
    expect(refunded.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints,
    );
    expect(refunded.ledger.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(["redemption", "refund"]),
    );
  });

  it("rejects a reward request that would overdraw the point account", async () => {
    const repository = createLocalFamilyRepository(createDemoSeed());

    await expect(
      repository.requestRedemption(
        {
          childId: DEMO_IDS.june,
          familyId: DEMO_IDS.family,
          idempotencyKey: "request-headphones-1",
          rewardId: DEMO_IDS.headphonesReward,
        },
        createCommandContext({
          actorId: DEMO_IDS.june,
          familyId: DEMO_IDS.family,
          idempotencyKey: "request-headphones-1",
        }),
      ),
    ).rejects.toThrow("enough points");
  });
});
