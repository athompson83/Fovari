// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../data/fixtures";

const mocks = vi.hoisted(() => ({
  createLocalCommandId: vi.fn((prefix: string) => `${prefix}-command`),
  push: vi.fn(),
  replace: vi.fn(),
  useFamilyAction: vi.fn(),
  useFamilySnapshot: vi.fn(),
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock("../hooks/use-family", () => ({
  createLocalCommandId: mocks.createLocalCommandId,
  useFamilyAction: mocks.useFamilyAction,
  useFamilySnapshot: mocks.useFamilySnapshot,
}));

import WelcomeRoute from "../../app/index";

const lastConfirmation = () => {
  const call = vi.mocked(Alert.alert).mock.calls.at(-1);
  const buttons = call?.[2] ?? [];
  return buttons.at(-1);
};

describe("WelcomeRoute", () => {
  beforeEach(() => {
    vi.spyOn(Alert, "alert").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("requires Start over confirmation before replacing an in-progress setup", async () => {
    const events: string[] = [];
    const snapshot = {
      ...createDemoSeed(),
      onboarding: {
        completedSteps: ["adult"] as const,
        currentStep: "family" as const,
        status: "in_progress" as const,
      },
      onboardingDraft: {
        adultDisplayName: "Morgan",
        childDrafts: [],
        familyName: "",
        notificationPreferences: createDemoSeed().notificationPreferences,
        pointsName: "Stars",
        selectedStarterGoalIds: [],
        selectedStarterRewardIds: [],
        timezone: "America/New_York",
      },
    };
    const repository = {
      beginFamilySetup: vi.fn(async () => {
        events.push("begin");
        return snapshot;
      }),
      resetDemo: vi.fn(),
      signInAdult: vi.fn(async () => {
        events.push("sign-in");
        return snapshot;
      }),
    };
    mocks.push.mockImplementation(() => events.push("navigate"));
    mocks.useFamilySnapshot.mockReturnValue(snapshot);
    mocks.useFamilyAction.mockReturnValue({
      busy: false,
      repository,
      run: (action: () => Promise<unknown>) => action(),
    });

    render(<WelcomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Create family account" }));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Start over with a new family?",
      expect.stringContaining("replace"),
      expect.any(Array),
    );
    expect(repository.signInAdult).not.toHaveBeenCalled();
    expect(repository.beginFamilySetup).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();

    act(() => lastConfirmation()?.onPress?.());
    await waitFor(() => expect(events).toEqual(["sign-in", "begin", "navigate"]));
  });

  it("detects a goal-only change and confirms reset before ordered successful navigation", async () => {
    const events: string[] = [];
    const baseline = createDemoSeed();
    const snapshot = {
      ...baseline,
      goals: [
        ...baseline.goals,
        {
          ...baseline.goals[0]!,
          id: "90000000-0000-4000-8000-000000000099",
          title: "Custom goal only",
        },
      ],
    };
    const repository = {
      beginFamilySetup: vi.fn(),
      resetDemo: vi.fn(async () => {
        events.push("reset");
        return createDemoSeed();
      }),
      signInAdult: vi.fn(async () => {
        events.push("sign-in");
        return snapshot;
      }),
    };
    mocks.replace.mockImplementation(() => events.push("navigate"));
    mocks.useFamilySnapshot.mockReturnValue(snapshot);
    mocks.useFamilyAction.mockReturnValue({
      busy: false,
      repository,
      run: (action: () => Promise<unknown>) => action(),
    });

    render(<WelcomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Explore the family demo" }));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Replace your local family?",
      expect.stringContaining("replace"),
      expect.any(Array),
    );
    expect(repository.signInAdult).not.toHaveBeenCalled();

    act(() => lastConfirmation()?.onPress?.());

    await waitFor(() => expect(events).toEqual(["sign-in", "reset", "navigate"]));
    expect(mocks.replace).toHaveBeenCalledWith("/(parent)/(tabs)/family");
  });

  it("starts from the untouched demo in order and navigates only after setup succeeds", async () => {
    const events: string[] = [];
    const snapshot = createDemoSeed();
    const repository = {
      beginFamilySetup: vi.fn(async () => {
        events.push("begin");
        return {
          ...snapshot,
          onboarding: { completedSteps: [], currentStep: "adult", status: "not_started" },
        };
      }),
      resetDemo: vi.fn(),
      signInAdult: vi.fn(async () => {
        events.push("sign-in");
        return snapshot;
      }),
    };
    mocks.push.mockImplementation(() => events.push("navigate"));
    mocks.useFamilySnapshot.mockReturnValue(snapshot);
    mocks.useFamilyAction.mockReturnValue({
      busy: false,
      repository,
      run: (action: () => Promise<unknown>) => action(),
    });

    render(<WelcomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Create family account" }));

    await waitFor(() => expect(events).toEqual(["sign-in", "begin", "navigate"]));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/onboarding");
  });

  it("does not navigate when a confirmed replacement command fails", async () => {
    const snapshot = { ...createDemoSeed(), pointsName: "Moonstones" };
    const repository = {
      beginFamilySetup: vi.fn().mockRejectedValue(new Error("write failed")),
      resetDemo: vi.fn(),
      signInAdult: vi.fn().mockResolvedValue(snapshot),
    };
    mocks.useFamilySnapshot.mockReturnValue(snapshot);
    mocks.useFamilyAction.mockReturnValue({
      busy: false,
      repository,
      run: (action: () => Promise<unknown>) => action(),
    });

    render(<WelcomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Create family account" }));
    act(() => lastConfirmation()?.onPress?.());

    await waitFor(() => expect(repository.beginFamilySetup).toHaveBeenCalledTimes(1));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("does not navigate when a confirmed demo reset fails", async () => {
    const snapshot = { ...createDemoSeed(), timezone: "America/Chicago" };
    const repository = {
      beginFamilySetup: vi.fn(),
      resetDemo: vi.fn().mockRejectedValue(new Error("reset failed")),
      signInAdult: vi.fn().mockResolvedValue(snapshot),
    };
    mocks.useFamilySnapshot.mockReturnValue(snapshot);
    mocks.useFamilyAction.mockReturnValue({
      busy: false,
      repository,
      run: (action: () => Promise<unknown>) => action(),
    });

    render(<WelcomeRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Explore the family demo" }));
    act(() => lastConfirmation()?.onPress?.());

    await waitFor(() => expect(repository.resetDemo).toHaveBeenCalledTimes(1));
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
