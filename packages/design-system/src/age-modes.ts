import type { ExperienceMode } from "@fovari/domain";

export interface AgeModeTokens {
  accent: string;
  cardDensity: "spacious" | "comfortable" | "balanced" | "compact";
  headingScale: number;
  label: string;
  minimumTouchTarget: number;
  navigation: {
    calendar: string;
    goals: string;
    home: string;
    profile: string;
    rewards: string;
  };
  surface: string;
  tone: string;
}

const presentations: Readonly<Record<ExperienceMode, AgeModeTokens>> = {
  explorer: {
    accent: "#2F9D55",
    cardDensity: "spacious",
    headingScale: 1.2,
    label: "Explorer",
    minimumTouchTarget: 56,
    navigation: {
      calendar: "My Day",
      goals: "Jobs",
      home: "Home",
      profile: "Me",
      rewards: "Prizes",
    },
    surface: "#EDF9E8",
    tone: "simple, warm, and voice-friendly",
  },
  adventurer: {
    accent: "#246BFD",
    cardDensity: "comfortable",
    headingScale: 1.08,
    label: "Adventurer",
    minimumTouchTarget: 50,
    navigation: {
      calendar: "Calendar",
      goals: "Goals",
      home: "Home",
      profile: "Profile",
      rewards: "Rewards",
    },
    surface: "#EAF5FF",
    tone: "energetic, clear, and progress-focused",
  },
  independence: {
    accent: "#6C5CE7",
    cardDensity: "balanced",
    headingScale: 1,
    label: "Independence",
    minimumTouchTarget: 48,
    navigation: {
      calendar: "Calendar",
      goals: "Goals",
      home: "Today",
      profile: "Profile",
      rewards: "Rewards",
    },
    surface: "#F1EEFF",
    tone: "calm, capable, and autonomy-supportive",
  },
  launch: {
    accent: "#43516E",
    cardDensity: "compact",
    headingScale: 0.94,
    label: "Launch",
    minimumTouchTarget: 44,
    navigation: {
      calendar: "Schedule",
      goals: "Goals",
      home: "Dashboard",
      profile: "Profile",
      rewards: "Plans",
    },
    surface: "#E9EDF5",
    tone: "mature, practical, and future-focused",
  },
};

export const getAgeModeTokens = (mode: ExperienceMode): AgeModeTokens =>
  structuredClone(presentations[mode]);
