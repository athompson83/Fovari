import type { ExperienceMode } from "./types";

export function resolveExperienceMode(
  ageYears: number,
  parentOverride?: ExperienceMode,
): ExperienceMode {
  if (parentOverride) {
    return parentOverride;
  }

  if (ageYears <= 7) {
    return "explorer";
  }

  if (ageYears <= 11) {
    return "adventurer";
  }

  if (ageYears <= 14) {
    return "independence";
  }

  return "launch";
}
