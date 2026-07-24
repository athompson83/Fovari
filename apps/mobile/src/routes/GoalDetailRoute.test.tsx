// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed, DEMO_IDS } from "../data/fixtures";

const routeMocks = vi.hoisted(() => ({
  back: vi.fn(),
  occurrenceId: "30000000-0000-4000-8000-000000000004",
  replace: vi.fn(),
  snapshot: null as ReturnType<typeof createDemoSeed> | null,
}));

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ occurrenceId: routeMocks.occurrenceId }),
  useRouter: () => ({ back: routeMocks.back, replace: routeMocks.replace }),
}));

vi.mock("../hooks/use-family", () => ({
  createLocalCommandId: () => "completion-command",
  useFamilyAction: () => ({
    busy: false,
    error: null,
    repository: { submitCompletion: vi.fn() },
    run: (action: () => Promise<unknown>) => action(),
  }),
  useFamilySession: () => routeMocks.snapshot?.session ?? null,
  useFamilySnapshot: () => routeMocks.snapshot,
}));

import GoalDetailRoute from "../../app/(child)/goal/[occurrenceId]";

describe("child goal detail route", () => {
  beforeEach(() => {
    const seed = createDemoSeed();
    routeMocks.snapshot = {
      ...seed,
      activeActor: { childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" },
      children: seed.children.map((child) =>
        child.id === DEMO_IDS.alex ? { ...child, name: "Maya" } : child,
      ),
      session: { actorId: DEMO_IDS.alex, childId: DEMO_IDS.alex, kind: "child" },
    };
    routeMocks.occurrenceId = DEMO_IDS.makeBedGoal;
    routeMocks.back.mockReset();
    routeMocks.replace.mockReset();
  });

  afterEach(cleanup);

  it("does not reveal a sibling goal when Maya requests that sibling occurrence ID", () => {
    render(<GoalDetailRoute />);

    expect(screen.getByText("Goal not found")).toBeInTheDocument();
    expect(screen.queryByText("Put toys away")).not.toBeInTheDocument();
    expect(screen.queryByText("Put every toy in its home.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to goals" }));
    expect(routeMocks.replace).toHaveBeenCalledWith("/(child)/(tabs)/goals");
  });
});
