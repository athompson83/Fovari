import { describe, expect, it } from "vitest";

import { getAgeModeTokens } from "./age-modes";

describe("age-adaptive presentation tokens", () => {
  it("changes language, density, and interaction size rather than color alone", () => {
    const explorer = getAgeModeTokens("explorer");
    const launch = getAgeModeTokens("launch");

    expect(explorer.navigation.goals).toBe("Jobs");
    expect(launch.navigation.goals).toBe("Goals");
    expect(explorer.minimumTouchTarget).toBeGreaterThan(launch.minimumTouchTarget);
    expect(explorer.cardDensity).toBe("spacious");
    expect(launch.cardDensity).toBe("compact");
    expect(explorer.headingScale).toBeGreaterThan(launch.headingScale);
  });

  it("returns a complete presentation for every supported mode", () => {
    for (const mode of ["explorer", "adventurer", "independence", "launch"] as const) {
      expect(getAgeModeTokens(mode)).toMatchObject({
        accent: expect.stringMatching(/^#/),
        label: expect.any(String),
        navigation: {
          calendar: expect.any(String),
          goals: expect.any(String),
          home: expect.any(String),
          profile: expect.any(String),
          rewards: expect.any(String),
        },
      });
    }
  });
});
