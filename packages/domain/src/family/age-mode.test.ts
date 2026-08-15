import { describe, expect, it } from "vitest";

import { resolveExperienceMode } from "./age-mode";

describe("resolveExperienceMode", () => {
  it.each([
    [4, "explorer"],
    [7, "explorer"],
    [8, "adventurer"],
    [11, "adventurer"],
    [12, "independence"],
    [14, "independence"],
    [15, "launch"],
    [17, "launch"],
  ] as const)("maps age %i to %s", (age, expected) => {
    expect(resolveExperienceMode(age)).toBe(expected);
  });

  it("clamps ages outside the supported audience to the nearest mode", () => {
    expect(resolveExperienceMode(2)).toBe("explorer");
    expect(resolveExperienceMode(18)).toBe("launch");
  });

  it("uses the parent-selected mode instead of age", () => {
    expect(resolveExperienceMode(6, "independence")).toBe("independence");
  });
});
