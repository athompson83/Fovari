export interface StarterGoalDefinition {
  category: "chores" | "reading";
  emoji: string;
  id: string;
  instructions: string;
  pointValue: number;
  title: string;
}

export interface StarterRewardDefinition {
  emoji: string;
  id: string;
  pointCost: number;
  title: string;
  type: "experience" | "privilege";
}

export const STARTER_GOALS = [
  {
    category: "reading",
    emoji: "\u{1F4DA}",
    id: "starter-reading",
    instructions: "Read together for 15 minutes.",
    pointValue: 10,
    title: "Read together",
  },
  {
    category: "chores",
    emoji: "\u{1F9F8}",
    id: "starter-tidy",
    instructions: "Put your things back in their homes.",
    pointValue: 5,
    title: "Tidy up",
  },
] as const satisfies readonly StarterGoalDefinition[];

export const STARTER_REWARDS = [
  {
    emoji: "\u{1F37F}",
    id: "starter-movie",
    pointCost: 100,
    title: "Family movie night",
    type: "experience" as const,
  },
  {
    emoji: "\u{1F3AE}",
    id: "starter-game-time",
    pointCost: 50,
    title: "30 minutes game time",
    type: "privilege" as const,
  },
] as const satisfies readonly StarterRewardDefinition[];
