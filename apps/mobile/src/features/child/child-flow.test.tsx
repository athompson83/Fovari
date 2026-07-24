// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDemoSeed, DEMO_IDS } from "../../data/fixtures";
import { ChildHome } from "./ChildHome";

describe("child home", () => {
  it("presents the next task, earned progress, and a safe parent handoff", () => {
    const onGoal = vi.fn();
    const onParentGate = vi.fn();
    const snapshot = createDemoSeed();

    render(
      <ChildHome
        child={snapshot.children[0]!}
        goals={snapshot.goals.filter((goal) => goal.childId === DEMO_IDS.alex)}
        onOpenGoal={onGoal}
        onParentGate={onParentGate}
        reward={snapshot.rewards.find(
          (item) => item.id === snapshot.selectedRewardByChild[DEMO_IDS.alex],
        )!}
      />,
    );

    expect(screen.getByText("Hi, Alex!")).toBeInTheDocument();
    expect(screen.getByText("Read for 20 minutes")).toBeInTheDocument();
    expect(screen.getByText("240 stars")).toBeInTheDocument();
    expect(screen.getByText("80 stars to go")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Read for 20 minutes" }));
    fireEvent.click(screen.getByRole("button", { name: "Open parent gate" }));

    expect(onGoal).toHaveBeenCalledWith(DEMO_IDS.readingGoal);
    expect(onParentGate).toHaveBeenCalledOnce();
  });
});
