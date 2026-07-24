import { err, ok, type Result } from "../shared/result";

export const ONBOARDING_STEPS = [
  "adult",
  "family",
  "children",
  "starter_goals",
  "starter_rewards",
  "notifications",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number] | "complete";
export type OnboardingStatus = "not_started" | "in_progress" | "complete";

export interface OnboardingState {
  completedSteps: readonly Exclude<OnboardingStep, "complete">[];
  currentStep: OnboardingStep;
  status: OnboardingStatus;
}

export interface OnboardingError {
  code: "step_out_of_order";
  message: string;
}

export const createOnboardingState = (): OnboardingState => ({
  completedSteps: [],
  currentStep: "adult",
  status: "not_started",
});

export function completeOnboardingStep(
  state: OnboardingState,
  step: Exclude<OnboardingStep, "complete">,
): Result<OnboardingState, OnboardingError> {
  if (state.currentStep !== step || state.status === "complete") {
    return err({
      code: "step_out_of_order",
      message: `Complete ${state.currentStep} before ${step}.`,
    });
  }

  const completedSteps = [...state.completedSteps, step];
  const nextIndex = ONBOARDING_STEPS.indexOf(step) + 1;
  const currentStep = ONBOARDING_STEPS[nextIndex] ?? "complete";

  return ok({
    completedSteps,
    currentStep,
    status: currentStep === "complete" ? "complete" : "in_progress",
  });
}
