// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { OnboardingWizard } from "./OnboardingWizard";

const clickContinue = async () => {
  const progress = screen.getByRole("progressbar").getAttribute("aria-label") ?? "";
  const currentStep = Number(progress.match(/step (\d+)/)?.[1]);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("progressbar", {
    name: `Onboarding step ${currentStep + 1} of 7`,
  });
  if (currentStep + 1 < 7) {
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  }
};

describe("OnboardingWizard", () => {
  afterEach(cleanup);
  it("creates a family, child, starter goal, reward, and preferences", async () => {
    const completeFamilySetup = vi.fn().mockResolvedValue({
      ...createDemoSeed(),
      familyName: "The Park Family",
    });
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={completeFamilySetup}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your display name"), {
      target: { value: "Morgan" },
    });
    await clickContinue();

    fireEvent.change(screen.getByLabelText("Family name"), {
      target: { value: "The Park Family" },
    });
    await clickContinue();

    fireEvent.change(screen.getByLabelText("Child name"), {
      target: { value: "Maya" },
    });
    fireEvent.click(screen.getByLabelText("Explorer ages 4 to 7"));
    fireEvent.click(screen.getByText("Add child"));
    await clickContinue();

    fireEvent.click(screen.getByLabelText("Select starter goal Read together"));
    await clickContinue();
    fireEvent.click(screen.getByLabelText("Select starter reward Family movie night"));
    await clickContinue();
    await clickContinue();
    const createButton = screen.getByRole("button", { name: "Create my family" });
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    await waitFor(() => expect(completeFamilySetup).toHaveBeenCalledTimes(1));
    expect(completeFamilySetup).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          adultDisplayName: "Morgan",
          familyName: "The Park Family",
        }),
      }),
    );
    expect(saveOnboardingDraft).toHaveBeenCalledTimes(6);
  });

  it("resumes at the hydrated step and persists the next completed step", async () => {
    const initialDraft = {
      adultDisplayName: "Morgan",
      childDrafts: [
        {
          clientId: "draft-maya",
          displayName: "Maya",
          experienceMode: "explorer" as const,
          pinRequested: false,
        },
      ],
      familyName: "The Park Family",
      notificationPreferences: {
        approvalUpdates: true,
        childEncouragement: true,
        enabled: false,
        quietHoursEnd: "07:00",
        quietHoursStart: "20:00",
        weeklySummary: true,
      },
      pointsName: "Stars",
      selectedStarterGoalIds: [],
      selectedStarterRewardIds: [],
      timezone: "America/New_York",
    };
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={initialDraft}
        initialOnboarding={{
          completedSteps: ["adult", "family", "children"],
          currentStep: "starter_goals",
          status: "in_progress",
        }}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    expect(screen.queryByLabelText("Your display name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select starter goal Read together"));
    await clickContinue();

    expect(saveOnboardingDraft).toHaveBeenCalledWith({
      draft: expect.objectContaining({
        selectedStarterGoalIds: ["starter-reading"],
      }),
      onboarding: expect.objectContaining({
        completedSteps: ["adult", "family", "children", "starter_goals"],
        currentStep: "starter_rewards",
      }),
    });
    expect(screen.getByText("Choose a starter reward")).toBeInTheDocument();
  });

  it("validates the active step and keeps entered data when persistence fails", async () => {
    const saveOnboardingDraft = vi.fn().mockRejectedValue(new Error("Local save unavailable"));

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Enter your display name.")).toBeInTheDocument();
    expect(saveOnboardingDraft).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Your display name"), {
      target: { value: "Morgan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(screen.getByText("Local save unavailable")).toBeInTheDocument());
    expect(screen.getByLabelText("Your display name")).toHaveValue("Morgan");
    expect(screen.queryByLabelText("Family name")).not.toBeInTheDocument();
  });

  it("validates the family points name before persisting the family step", async () => {
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());
    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your display name"), {
      target: { value: "Morgan" },
    });
    await clickContinue();
    fireEvent.change(screen.getByLabelText("Family name"), {
      target: { value: "The Park Family" },
    });
    fireEvent.change(screen.getByLabelText("Family points name"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Enter a family points name.")).toBeInTheDocument();
    expect(saveOnboardingDraft).toHaveBeenCalledTimes(1);
  });

  it("requires requested PINs to match the child draft and never persists PIN digits", async () => {
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your display name"), {
      target: { value: "Morgan" },
    });
    await clickContinue();
    fireEvent.change(screen.getByLabelText("Family name"), {
      target: { value: "The Park Family" },
    });
    await clickContinue();

    fireEvent.change(screen.getByLabelText("Child name"), {
      target: { value: "Maya" },
    });
    fireEvent.click(screen.getByLabelText("Explorer ages 4 to 7"));
    fireEvent.click(screen.getByLabelText("Use a PIN for this child"));
    fireEvent.change(screen.getByLabelText("Child PIN"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add child" }));
    expect(screen.getByText("Use a 4 to 6 digit PIN.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Child PIN"), {
      target: { value: "2468" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add child" }));
    await clickContinue();

    const childrenSave = saveOnboardingDraft.mock.calls.at(-1)?.[0];
    expect(childrenSave.draft.childDrafts).toEqual([
      expect.objectContaining({ displayName: "Maya", pinRequested: true }),
    ]);
    expect(JSON.stringify(childrenSave)).not.toContain("2468");
  });

  it("keeps resumed PIN entry available until the complete value is entered", () => {
    const initialDraft = {
      ...createDefaultDraftForReview(),
      childDrafts: [
        {
          clientId: "draft-maya",
          displayName: "Maya",
          experienceMode: "explorer" as const,
          pinRequested: true,
        },
      ],
    };

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={initialDraft}
        initialOnboarding={{
          completedSteps: [
            "adult",
            "family",
            "children",
            "starter_goals",
            "starter_rewards",
            "notifications",
          ],
          currentStep: "review",
          status: "in_progress",
        }}
        saveOnboardingDraft={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("PIN for Maya"), { target: { value: "2" } });

    expect(screen.getByLabelText("PIN for Maya")).toBeInTheDocument();
  });
});

const createDefaultDraftForReview = () => ({
  adultDisplayName: "Morgan",
  childDrafts: [],
  familyName: "The Park Family",
  notificationPreferences: {
    approvalUpdates: true,
    childEncouragement: true,
    enabled: false,
    quietHoursEnd: "07:00",
    quietHoursStart: "20:00",
    weeklySummary: true,
  },
  pointsName: "Stars",
  selectedStarterGoalIds: ["starter-reading"],
  selectedStarterRewardIds: ["starter-movie"],
  timezone: "America/New_York",
});
