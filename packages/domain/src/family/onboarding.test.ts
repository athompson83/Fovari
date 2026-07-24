import { describe, expect, it } from "vitest";

import { completeOnboardingStep, createOnboardingState } from "./onboarding";

describe("family onboarding", () => {
  it("advances only through the configured order", () => {
    const initial = createOnboardingState();
    const adult = completeOnboardingStep(initial, "adult");

    expect(adult).toEqual({
      ok: true,
      value: {
        completedSteps: ["adult"],
        currentStep: "family",
        status: "in_progress",
      },
    });
  });

  it("rejects skipped and repeated steps", () => {
    const initial = createOnboardingState();

    expect(completeOnboardingStep(initial, "children")).toMatchObject({
      error: { code: "step_out_of_order" },
      ok: false,
    });

    const adult = completeOnboardingStep(initial, "adult");
    if (!adult.ok) throw new Error("adult step must pass");

    expect(completeOnboardingStep(adult.value, "adult")).toMatchObject({
      error: { code: "step_out_of_order" },
      ok: false,
    });
  });

  it("marks setup complete after review", () => {
    let state = createOnboardingState();
    for (const step of [
      "adult",
      "family",
      "children",
      "starter_goals",
      "starter_rewards",
      "notifications",
      "review",
    ] as const) {
      const result = completeOnboardingStep(state, step);
      if (!result.ok) throw new Error(result.error.message);
      state = result.value;
    }

    expect(state.status).toBe("complete");
    expect(state.currentStep).toBe("complete");
  });
});
