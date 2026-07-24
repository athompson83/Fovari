export const FOVARI_DOMAIN_VERSION = 1 as const;

export { resolveExperienceMode } from "./family/age-mode";
export { attemptChildUnlock } from "./family/child-unlock";
export type { ChildUnlockDecision, ChildUnlockInput } from "./family/child-unlock";
export {
  completeOnboardingStep,
  createOnboardingState,
  ONBOARDING_STEPS,
} from "./family/onboarding";
export type {
  OnboardingError,
  OnboardingState,
  OnboardingStatus,
  OnboardingStep,
} from "./family/onboarding";
export { can } from "./family/permissions";
export type { FamilyActor, FamilyPermission } from "./family/permissions";
export type { ExperienceMode, FamilyRole } from "./family/types";
export { generateDailyOccurrences } from "./goals/occurrence";
export type { GenerateDailyOccurrencesInput } from "./goals/occurrence";
export type { GoalOccurrence, OccurrenceStatus } from "./goals/types";
export { reducePointLedger } from "./points/ledger";
export type {
  PointAccountProjection,
  PointTransaction,
  PointTransactionType,
} from "./points/ledger";
export { requestRedemption } from "./rewards/redemption";
export type {
  RedemptionDecision,
  RedemptionError,
  RedemptionErrorCode,
  RequestRedemptionInput,
  RewardPolicy,
} from "./rewards/redemption";
export { err, ok } from "./shared/result";
export type { Result } from "./shared/result";
