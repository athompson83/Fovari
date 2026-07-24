import type {
  ExperienceMode,
  FamilyActor,
  OnboardingState,
  PointTransaction,
} from "@fovari/domain";
import type {
  ConfigureChildPinInput,
  CreateChildInput,
  CreateFamilyInput,
  CreateGoalInput,
  NotificationPreferencesInput,
  OnboardingChildDraftInput,
  RequestRedemptionCommandInput,
  SubmitCompletionInput,
  UnlockChildInput,
} from "@fovari/validation";

import type { CommandContext } from "./commands";

export interface ChildSummary {
  avatarKey: string;
  completedToday: number;
  experienceMode: ExperienceMode;
  id: string;
  level: number;
  name: string;
  points: number;
  pinConfigured: boolean;
  streakDays: number;
  totalToday: number;
}

export type GoalStatus = "ready" | "submitted" | "approved" | "completed";

export interface GoalSummary {
  category: string;
  childId: string;
  dueLabel: string;
  id: string;
  instructions: string;
  pointValue: number;
  progressCurrent?: number;
  progressTarget?: number;
  status: GoalStatus;
  title: string;
  verification: "attestation" | "checklist" | "parent" | "timer";
}

export interface CompletionSummary {
  childId: string;
  childNote?: string;
  durationSeconds?: number;
  goalId: string;
  id: string;
  status: "submitted" | "approved" | "needs_changes" | "rejected";
  submittedAt: string;
}

export interface RewardSummary {
  accent: string;
  emoji: string;
  id: string;
  pointCost: number;
  title: string;
  type: "experience" | "privilege" | "physical_item" | "savings_goal" | "custom";
}

export interface RedemptionSummary {
  childId: string;
  id: string;
  pointCost: number;
  rewardId: string;
  status: "requested" | "approved" | "scheduled" | "fulfilled" | "rejected" | "refunded";
}

export interface CalendarItem {
  childId?: string;
  color: string;
  icon: string;
  id: string;
  timeLabel: string;
  title: string;
}

export interface AchievementSummary {
  childId: string;
  description: string;
  earnedOn: string;
  emoji: string;
  id: string;
  title: string;
}

export type FamilySession =
  | { kind: "signed_out" }
  | { actorId: string; kind: "adult" }
  | { actorId: string; childId: string; kind: "child" };

export interface LocalAdultSummary {
  displayName: string;
  id: string;
}

export type NotificationPreferences = NotificationPreferencesInput;

export interface OnboardingDraft {
  adultDisplayName: string;
  childDrafts: readonly OnboardingChildDraftInput[];
  familyName: string;
  notificationPreferences: NotificationPreferences;
  pointsName: string;
  selectedStarterGoalIds: readonly string[];
  selectedStarterRewardIds: readonly string[];
  timezone: string;
}

export interface BeginFamilySetupInput {
  adultDisplayName: string;
}

export interface SaveOnboardingDraftInput {
  draft: OnboardingDraft;
  onboarding: OnboardingState;
}

export interface CompleteFamilySetupInput {
  childPins: Readonly<Record<string, string>>;
  draft: OnboardingDraft;
}

export type { ConfigureChildPinInput, UnlockChildInput };

export interface FamilySnapshot {
  achievements: readonly AchievementSummary[];
  activeActor: FamilyActor;
  activeChildId: string;
  adult: LocalAdultSummary;
  calendar: readonly CalendarItem[];
  children: readonly ChildSummary[];
  completions: readonly CompletionSummary[];
  familyId: string;
  familyName: string;
  goals: readonly GoalSummary[];
  ledger: readonly PointTransaction[];
  notificationPreferences: NotificationPreferences;
  onboarding: OnboardingState;
  onboardingDraft: OnboardingDraft | null;
  pointsName: string;
  redemptions: readonly RedemptionSummary[];
  rewards: readonly RewardSummary[];
  selectedRewardByChild: Readonly<Record<string, string>>;
  session: FamilySession;
  timezone: string;
}

export interface ApproveCompletionInput {
  completionId: string;
  parentNote?: string;
  pointsAwarded?: number;
}

export interface CreateRewardInput {
  eligibleChildIds: readonly string[];
  pointCost: number;
  title: string;
  type: RewardSummary["type"];
}

export interface DecideRedemptionInput {
  decision: "approve" | "fulfill" | "reject" | "refund" | "schedule";
  redemptionId: string;
}

export interface FamilyRepository {
  approveCompletion(
    input: ApproveCompletionInput,
    context: CommandContext,
  ): Promise<FamilySnapshot>;
  beginFamilySetup(input: BeginFamilySetupInput, context: CommandContext): Promise<FamilySnapshot>;
  completeFamilySetup(
    input: CompleteFamilySetupInput,
    context: CommandContext,
  ): Promise<FamilySnapshot>;
  configureChildPin(
    input: ConfigureChildPinInput,
    context: CommandContext,
  ): Promise<FamilySnapshot>;
  createChild(input: CreateChildInput, context: CommandContext): Promise<FamilySnapshot>;
  createFamily(input: CreateFamilyInput, context: CommandContext): Promise<FamilySnapshot>;
  createGoal(input: CreateGoalInput, context: CommandContext): Promise<FamilySnapshot>;
  createReward(input: CreateRewardInput, context: CommandContext): Promise<FamilySnapshot>;
  decideRedemption(input: DecideRedemptionInput, context: CommandContext): Promise<FamilySnapshot>;
  getSnapshot(): Promise<FamilySnapshot>;
  resetDemo(context: CommandContext): Promise<FamilySnapshot>;
  requestRedemption(
    input: RequestRedemptionCommandInput,
    context: CommandContext,
  ): Promise<FamilySnapshot>;
  saveOnboardingDraft(
    input: SaveOnboardingDraftInput,
    context: CommandContext,
  ): Promise<FamilySnapshot>;
  selectChild(childId: string): Promise<FamilySnapshot>;
  selectReward(childId: string, rewardId: string): Promise<FamilySnapshot>;
  signInAdult(): Promise<FamilySnapshot>;
  signOut(): Promise<FamilySnapshot>;
  submitCompletion(input: SubmitCompletionInput, context: CommandContext): Promise<FamilySnapshot>;
  switchActor(actor: FamilyActor): Promise<FamilySnapshot>;
  unlockChild(input: UnlockChildInput): Promise<FamilySnapshot>;
}
