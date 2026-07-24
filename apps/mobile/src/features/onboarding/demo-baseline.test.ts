import { describe, expect, it } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { isUntouchedDemoSnapshot } from "./demo-baseline";

describe("isUntouchedDemoSnapshot", () => {
  it.each([
    {
      change: () => {
        const seed = createDemoSeed();
        return { ...seed, rewards: [{ ...seed.rewards[0]!, title: "Custom reward" }] };
      },
      field: "rewards",
    },
    {
      change: () => ({ ...createDemoSeed(), pointsName: "Moonstones" }),
      field: "points",
    },
    {
      change: () => ({ ...createDemoSeed(), timezone: "America/Chicago" }),
      field: "timezone",
    },
    {
      change: () => ({
        ...createDemoSeed(),
        notificationPreferences: {
          ...createDemoSeed().notificationPreferences,
          weeklySummary: false,
        },
      }),
      field: "preferences",
    },
    {
      change: () => {
        const seed = createDemoSeed();
        return { ...seed, ledger: [{ ...seed.ledger[0]!, amount: 999 }] };
      },
      field: "ledger",
    },
    {
      change: () => {
        const seed = createDemoSeed();
        return {
          ...seed,
          completions: [{ ...seed.completions[0]!, status: "rejected" as const }],
        };
      },
      field: "completions",
    },
  ])("treats a $field-only change as persisted custom state", ({ change }) => {
    expect(isUntouchedDemoSnapshot(change())).toBe(false);
  });

  it("ignores only transient session, actor, and active-selection changes", () => {
    const seed = createDemoSeed();
    expect(
      isUntouchedDemoSnapshot({
        ...seed,
        activeActor: { id: seed.children[1]!.id, role: "child" },
        activeChildId: seed.children[1]!.id,
        selectedRewardByChild: {},
        session: {
          actorId: seed.children[1]!.id,
          childId: seed.children[1]!.id,
          kind: "child",
        },
      }),
    ).toBe(true);
  });
});
