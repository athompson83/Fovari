import { describe, expect, it } from "vitest";

import { can, type FamilyActor } from "./permissions";

const owner: FamilyActor = { id: "owner", role: "family_owner" };
const parent: FamilyActor = { id: "parent", role: "parent" };
const caregiver: FamilyActor = { id: "caregiver", role: "caregiver" };
const child: FamilyActor = { childId: "child", id: "child-session", role: "child" };

describe("family permissions", () => {
  it("lets only the family owner manage billing by default", () => {
    expect(can("manage_billing", owner)).toBe(true);
    expect(can("manage_billing", parent)).toBe(false);
    expect(can("manage_billing", caregiver)).toBe(false);
    expect(can("manage_billing", child)).toBe(false);
  });

  it("lets parents and guardians manage the core family loop by default", () => {
    expect(can("create_goals", parent)).toBe(true);
    expect(can("approve_completions", parent)).toBe(true);
    expect(can("manage_rewards", parent)).toBe(true);
  });

  it("denies caregiver permissions unless an adult explicitly grants them", () => {
    expect(can("approve_completions", caregiver)).toBe(false);
    expect(
      can("approve_completions", {
        ...caregiver,
        permissions: { approve_completions: true },
      }),
    ).toBe(true);
  });

  it("never lets a child self-elevate through client permission overrides", () => {
    expect(
      can("approve_completions", {
        ...child,
        permissions: { approve_completions: true, manage_billing: true },
      }),
    ).toBe(false);
  });

  it("uses deny by default for an explicit adult restriction", () => {
    expect(
      can("manage_rewards", {
        ...parent,
        permissions: { manage_rewards: false },
      }),
    ).toBe(false);
  });
});
