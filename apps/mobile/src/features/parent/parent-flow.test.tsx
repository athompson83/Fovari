// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { ParentDashboard } from "./ParentDashboard";

afterEach(cleanup);

describe("parent family dashboard", () => {
  it("summarizes every child, surfaces approvals, and makes the next action obvious", () => {
    const onAdd = vi.fn();
    const onApproval = vi.fn();
    const onHandoff = vi.fn();

    render(
      <ParentDashboard
        onAdd={onAdd}
        onHandoff={onHandoff}
        onOpenApprovals={onApproval}
        snapshot={createDemoSeed()}
      />,
    );

    expect(screen.getByText(/Good morning, Jamie/)).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("June")).toBeInTheDocument();
    expect(screen.getByText("1 awaiting your review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add a goal or reward" }));
    fireEvent.click(screen.getByRole("button", { name: "Review pending approvals" }));
    fireEvent.click(screen.getByRole("button", { name: "Hand off to Alex" }));

    expect(onAdd).toHaveBeenCalledOnce();
    expect(onApproval).toHaveBeenCalledOnce();
    expect(onHandoff).toHaveBeenCalledWith("20000000-0000-4000-8000-000000000001");
  });

  it("disables every child handoff while a handoff is in flight", () => {
    const onHandoff = vi.fn();

    render(
      <ParentDashboard
        handoffBusy
        onAdd={vi.fn()}
        onHandoff={onHandoff}
        onOpenApprovals={vi.fn()}
        snapshot={createDemoSeed()}
      />,
    );

    for (const handoff of screen.getAllByRole("button", { name: /Hand off to/ })) {
      expect(handoff).toBeDisabled();
      expect(handoff).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(handoff);
    }
    expect(onHandoff).not.toHaveBeenCalled();
  });
});
