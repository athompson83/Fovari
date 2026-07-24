// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { createDefaultOnboardingDraft, OnboardingWizard } from "./OnboardingWizard";

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

  it("keeps the saved draft immutable while a step save is pending", async () => {
    let resolveFirstSave: ((value: unknown) => void) | undefined;
    const firstSave = new Promise((resolve) => {
      resolveFirstSave = resolve;
    });
    const saveOnboardingDraft = vi
      .fn()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValue(createDemoSeed());

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    const adultInput = screen.getByLabelText("Your display name");
    fireEvent.change(adultInput, { target: { value: "Morgan" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(adultInput).toHaveAttribute("aria-disabled", "true"));
    fireEvent.change(adultInput, { target: { value: "Changed while saving" } });
    expect(adultInput).toHaveValue("Morgan");

    await act(async () => resolveFirstSave?.(createDemoSeed()));
    await screen.findByLabelText("Family name");
    fireEvent.change(screen.getByLabelText("Family name"), {
      target: { value: "The Park Family" },
    });
    await clickContinue();

    expect(saveOnboardingDraft.mock.calls[1]?.[0].draft.adultDisplayName).toBe("Morgan");
  });

  it.each([
    {
      controls: ["Your display name", "Continue"],
      draft: createDefaultOnboardingDraft(),
      name: "adult",
      onboarding: {
        completedSteps: [] as const,
        currentStep: "adult" as const,
        status: "not_started" as const,
      },
    },
    {
      controls: ["Family name", "Family points name", "Continue"],
      draft: createDefaultDraftForReview(),
      name: "family",
      onboarding: {
        completedSteps: ["adult"] as const,
        currentStep: "family" as const,
        status: "in_progress" as const,
      },
    },
    {
      controls: [
        "Remove Maya",
        "Child name",
        "Explorer ages 4 to 7",
        "Use a PIN for this child",
        "Add child",
        "Continue",
      ],
      draft: {
        ...createDefaultDraftForReview(),
        childDrafts: [
          {
            clientId: "draft-maya",
            displayName: "Maya",
            experienceMode: "explorer" as const,
            pinRequested: false,
          },
        ],
      },
      name: "children",
      onboarding: {
        completedSteps: ["adult", "family"] as const,
        currentStep: "children" as const,
        status: "in_progress" as const,
      },
    },
    {
      controls: ["Select starter goal Read together", "Continue"],
      draft: createDefaultDraftForReview(),
      name: "starter goals",
      onboarding: {
        completedSteps: ["adult", "family", "children"] as const,
        currentStep: "starter_goals" as const,
        status: "in_progress" as const,
      },
    },
    {
      controls: ["Select starter reward Family movie night", "Continue"],
      draft: createDefaultDraftForReview(),
      name: "starter rewards",
      onboarding: {
        completedSteps: ["adult", "family", "children", "starter_goals"] as const,
        currentStep: "starter_rewards" as const,
        status: "in_progress" as const,
      },
    },
    {
      controls: ["Enable family notifications", "Approval updates", "Continue"],
      draft: createDefaultDraftForReview(),
      name: "notifications",
      onboarding: {
        completedSteps: [
          "adult",
          "family",
          "children",
          "starter_goals",
          "starter_rewards",
        ] as const,
        currentStep: "notifications" as const,
        status: "in_progress" as const,
      },
    },
    {
      controls: ["PIN for Maya", "Create my family"],
      draft: {
        ...createDefaultDraftForReview(),
        childDrafts: [
          {
            clientId: "draft-maya",
            displayName: "Maya",
            experienceMode: "explorer" as const,
            pinRequested: true,
          },
        ],
      },
      name: "review",
      onboarding: {
        completedSteps: [
          "adult",
          "family",
          "children",
          "starter_goals",
          "starter_rewards",
          "notifications",
        ] as const,
        currentStep: "review" as const,
        status: "in_progress" as const,
      },
    },
  ])("marks every $name mutation disabled while busy", ({ controls, draft, onboarding }) => {
    render(
      <OnboardingWizard
        busy
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={draft}
        initialOnboarding={onboarding}
        saveOnboardingDraft={vi.fn()}
      />,
    );

    for (const label of controls) {
      expect(screen.getByLabelText(label)).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("rewinds an out-of-order completed-step ledger to its safe canonical prefix", async () => {
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());
    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={createDefaultDraftForReview()}
        initialOnboarding={{
          completedSteps: ["adult", "children", "family"],
          currentStep: "starter_rewards",
          status: "in_progress",
        }}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    expect(screen.getByLabelText("Family name")).toHaveValue("The Park Family");
    expect(screen.getByText(/We repaired your saved setup/)).toBeInTheDocument();
    await clickContinue();

    expect(saveOnboardingDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding: {
          completedSteps: ["adult", "family"],
          currentStep: "children",
          status: "in_progress",
        },
      }),
    );
  });

  it.each([
    {
      expectedSelection: ["starter-reading"],
      ids: ["starter-reading", "stale-goal"],
      label: "goal",
      title: "Choose a starter goal",
    },
    {
      expectedSelection: ["starter-movie"],
      ids: ["starter-movie", "stale-reward"],
      label: "reward",
      title: "Choose a starter reward",
    },
  ])(
    "filters a stale starter $label and rewinds review for correction",
    async ({ expectedSelection, ids, label, title }) => {
      const base = createDefaultDraftForReview();
      const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());
      const initialDraft =
        label === "goal"
          ? { ...base, selectedStarterGoalIds: ids }
          : { ...base, selectedStarterRewardIds: ids };

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
          saveOnboardingDraft={saveOnboardingDraft}
        />,
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(/We repaired your saved setup/)).toBeInTheDocument();
      const selectedControl = screen.getByLabelText(
        label === "goal"
          ? "Select starter goal Read together"
          : "Select starter reward Family movie night",
      );
      expect(selectedControl).toHaveAttribute("aria-checked", "true");
      expect(screen.queryByText(ids[1]!)).not.toBeInTheDocument();
      await clickContinue();
      expect(saveOnboardingDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining(
            label === "goal"
              ? { selectedStarterGoalIds: expectedSelection }
              : { selectedStarterRewardIds: expectedSelection },
          ),
        }),
      );
    },
  );

  it("rewinds a later resume with a missing starter reward", () => {
    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={vi.fn()}
        error={null}
        initialDraft={{
          ...createDefaultDraftForReview(),
          selectedStarterRewardIds: [],
        }}
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

    expect(screen.getByText("Choose a starter reward")).toBeInTheDocument();
    expect(screen.getByText(/We repaired your saved setup/)).toBeInTheDocument();
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
