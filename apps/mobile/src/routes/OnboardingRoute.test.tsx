// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../data/fixtures";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  useFamilyAction: vi.fn(),
  useFamilySnapshot: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("../hooks/use-family", () => ({
  createLocalCommandId: (prefix: string) => `${prefix}-command`,
  useFamilyAction: mocks.useFamilyAction,
  useFamilySnapshot: mocks.useFamilySnapshot,
}));

import OnboardingRoute from "../../app/onboarding";

const renderRoute = (snapshot: ReturnType<typeof createDemoSeed>) => {
  mocks.useFamilySnapshot.mockReturnValue(snapshot);
  mocks.useFamilyAction.mockReturnValue({
    busy: false,
    error: null,
    repository: {
      completeFamilySetup: vi.fn(),
      saveOnboardingDraft: vi.fn(),
    },
    run: (action: () => Promise<unknown>) => action(),
  });
  return render(<OnboardingRoute />);
};

describe("OnboardingRoute", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    {
      label: "child",
      session: {
        actorId: "20000000-0000-4000-8000-000000000001",
        childId: "20000000-0000-4000-8000-000000000001",
        kind: "child" as const,
      },
    },
    { label: "signed out", session: { kind: "signed_out" as const } },
  ])("does not mount draft content for a $label session", ({ session }) => {
    renderRoute({
      ...createDemoSeed(),
      onboarding: { completedSteps: [], currentStep: "adult", status: "not_started" },
      onboardingDraft: null,
      session,
    });

    expect(screen.queryByLabelText("Your display name")).not.toBeInTheDocument();
    expect(screen.getByText("Grown-up access required")).toBeInTheDocument();
  });

  it("redirects completed onboarding without mounting the wizard", async () => {
    renderRoute(createDemoSeed());

    expect(screen.queryByLabelText("Your display name")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/(parent)/(tabs)/family"));
  });

  it("mounts a begun setup only for an adult session", () => {
    renderRoute({
      ...createDemoSeed(),
      onboarding: { completedSteps: [], currentStep: "adult", status: "not_started" },
      onboardingDraft: null,
      session: {
        actorId: createDemoSeed().adult.id,
        kind: "adult",
      },
    });

    expect(screen.getByLabelText("Your display name")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
