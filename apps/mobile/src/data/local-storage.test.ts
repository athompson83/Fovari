import { describe, expect, it } from "vitest";

import { createDemoSeed } from "./fixtures";
import { createMemoryStorage, readLocalEnvelope, writeLocalEnvelope } from "./local-storage";

describe("versioned local family storage", () => {
  it("uses the supplied seed once and restores a written envelope", async () => {
    const storage = createMemoryStorage();
    const seed = createDemoSeed();
    const initial = await readLocalEnvelope(storage, seed);

    expect(initial.version).toBe(1);
    expect(initial.snapshot.familyName).toBe("The Rivera Family");

    const changed = {
      ...initial,
      snapshot: { ...initial.snapshot, familyName: "The Park Family" },
    };
    await writeLocalEnvelope(storage, changed);

    expect((await readLocalEnvelope(storage, seed)).snapshot.familyName).toBe("The Park Family");
  });

  it("persists a complete onboarding draft using the shared child-draft contract", async () => {
    const storage = createMemoryStorage();
    const initial = await readLocalEnvelope(storage, createDemoSeed());
    const withDraft = {
      ...initial,
      snapshot: {
        ...initial.snapshot,
        onboardingDraft: {
          adultDisplayName: "Jamie",
          childDrafts: [
            {
              clientId: "draft-alex",
              displayName: "Alex",
              experienceMode: "adventurer" as const,
              pinRequested: true,
            },
          ],
          familyName: "The Rivera Family",
          notificationPreferences: initial.snapshot.notificationPreferences,
          pointsName: "Stars",
          selectedStarterGoalIds: [],
          selectedStarterRewardIds: [],
          timezone: "America/New_York",
        },
      },
    };

    await writeLocalEnvelope(storage, withDraft);

    expect((await readLocalEnvelope(storage, createDemoSeed())).snapshot.onboardingDraft).toEqual(
      withDraft.snapshot.onboardingDraft,
    );
  });

  it("rejects unsupported data without silently changing permissions", async () => {
    const storage = createMemoryStorage({
      "fovari.local-family": JSON.stringify({ version: 99 }),
    });

    await expect(readLocalEnvelope(storage, createDemoSeed())).rejects.toThrow(
      "Unsupported local family data",
    );
  });

  it("rejects corrupt, incomplete, and invalid persisted envelopes", async () => {
    const seed = createDemoSeed();
    const valid = await readLocalEnvelope(createMemoryStorage(), seed);
    const invalidRecords = [
      "{not json",
      JSON.stringify(null),
      JSON.stringify({ version: 1 }),
      JSON.stringify({ ...valid, nextSequence: -1 }),
      JSON.stringify({
        ...valid,
        offlineActions: [
          {
            actorId: seed.adult.id,
            attemptCount: 0,
            commandType: "select_reward",
            createdAt: "2026-07-24T13:15:00.000Z",
            entityId: "reward-1",
            idempotencyKey: "command-1",
            payload: {},
            status: "unsafe_status",
          },
        ],
      }),
      JSON.stringify({ ...valid, snapshot: { ...seed, familyName: undefined } }),
      JSON.stringify({
        ...valid,
        snapshot: {
          ...seed,
          onboardingDraft: {
            adultDisplayName: "Jamie",
            childDrafts: [],
            familyName: "The Rivera Family",
            notificationPreferences: {},
            pointsName: "Stars",
            selectedStarterGoalIds: [],
            selectedStarterRewardIds: [],
            timezone: "America/New_York",
          },
        },
      }),
    ];

    for (const serialized of invalidRecords) {
      await expect(
        readLocalEnvelope(createMemoryStorage({ "fovari.local-family": serialized }), seed),
      ).rejects.toThrow("Invalid local family data");
    }
  });

  it("rejects session and active-actor records that do not describe the same family identity", async () => {
    const seed = createDemoSeed();
    const valid = await readLocalEnvelope(createMemoryStorage(), seed);
    const inconsistent = {
      ...valid,
      snapshot: {
        ...seed,
        session: { actorId: seed.children[0]?.id ?? "unknown", kind: "adult" } as const,
      },
    };

    await expect(
      readLocalEnvelope(
        createMemoryStorage({ "fovari.local-family": JSON.stringify(inconsistent) }),
        seed,
      ),
    ).rejects.toThrow("Invalid local family data");
  });

  it("rejects restart state that cannot be reconciled with the synthetic family", async () => {
    const seed = createDemoSeed();
    const valid = await readLocalEnvelope(createMemoryStorage(), seed);
    const ledgerEntry = seed.ledger[0]!;
    const invalidRecords = [
      {
        ...valid,
        pinAttempts: { "unknown-child": { failures: 1 } },
      },
      { ...valid, processedCommandIds: [] },
      {
        ...valid,
        snapshot: { ...seed, ledger: [...seed.ledger, ledgerEntry] },
      },
      {
        ...valid,
        snapshot: {
          ...seed,
          ledger: [ledgerEntry, { ...seed.ledger[1]!, id: ledgerEntry.id }],
        },
      },
      {
        ...valid,
        snapshot: {
          ...seed,
          ledger: [ledgerEntry, { ...seed.ledger[1]!, idempotencyKey: ledgerEntry.idempotencyKey }],
        },
      },
      {
        ...valid,
        snapshot: {
          ...seed,
          children: seed.children.map((child) =>
            child.id === ledgerEntry.childId ? { ...child, points: child.points + 1 } : child,
          ),
        },
      },
      {
        ...valid,
        offlineActions: [
          {
            actorId: "unknown-actor",
            attemptCount: 0,
            commandType: "select_reward",
            createdAt: "2026-07-24T13:15:00.000Z",
            entityId: "reward-1",
            idempotencyKey: "command-1",
            payload: {},
            status: "pending",
          },
        ],
      },
    ];

    for (const invalid of invalidRecords) {
      await expect(
        readLocalEnvelope(
          createMemoryStorage({ "fovari.local-family": JSON.stringify(invalid) }),
          seed,
        ),
      ).rejects.toThrow("Invalid local family data");
    }
  });

  it("validates an envelope before writing it", async () => {
    const storage = createMemoryStorage();
    const initial = await readLocalEnvelope(storage, createDemoSeed());

    await expect(writeLocalEnvelope(storage, { ...initial, nextSequence: 1.5 })).rejects.toThrow(
      "Invalid local family data",
    );
    expect(await storage.getItem("fovari.local-family")).toBeNull();
  });

  it("accepts the childless transitional snapshot used by persisted family setup", async () => {
    const storage = createMemoryStorage();
    const initial = await readLocalEnvelope(storage, createDemoSeed());
    const setupEnvelope = {
      ...initial,
      pinAttempts: {},
      processedCommandIds: ["begin-setup"],
      snapshot: {
        ...initial.snapshot,
        achievements: [],
        activeChildId: "",
        calendar: [],
        children: [],
        completions: [],
        familyName: "",
        goals: [],
        ledger: [],
        onboarding: {
          completedSteps: [],
          currentStep: "adult" as const,
          status: "not_started" as const,
        },
        redemptions: [],
        rewards: [],
        selectedRewardByChild: {},
      },
    };

    await writeLocalEnvelope(storage, setupEnvelope);

    expect((await readLocalEnvelope(storage, createDemoSeed())).snapshot.children).toEqual([]);
  });

  it("rejects an empty family name once a transitional snapshot has children", async () => {
    const storage = createMemoryStorage();
    const initial = await readLocalEnvelope(storage, createDemoSeed());
    const invalid = {
      ...initial,
      snapshot: {
        ...initial.snapshot,
        familyName: "",
        onboarding: {
          completedSteps: ["adult"] as const,
          currentStep: "family" as const,
          status: "in_progress" as const,
        },
      },
    };

    await expect(writeLocalEnvelope(storage, invalid)).rejects.toThrow("Invalid local family data");
    expect(await storage.getItem("fovari.local-family")).toBeNull();
  });

  it("does not write a syntactically valid envelope beyond the local size limit", async () => {
    const storage = createMemoryStorage();
    const initial = await readLocalEnvelope(storage, createDemoSeed());
    const oversized = {
      ...initial,
      offlineActions: Array.from({ length: 500 }, (_, index) => ({
        actorId: initial.snapshot.adult.id,
        attemptCount: 0,
        commandType: "select_reward" as const,
        createdAt: "2026-07-24T13:15:00.000Z",
        entityId: "reward-1",
        idempotencyKey: `oversized-${index}`,
        lastError: "x".repeat(4_096),
        payload: {},
        status: "pending" as const,
      })),
    };

    await expect(writeLocalEnvelope(storage, oversized)).rejects.toThrow(
      "Invalid local family data",
    );
    expect(await storage.getItem("fovari.local-family")).toBeNull();
  });
});
