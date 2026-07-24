// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { ProfilePicker } from "./ProfilePicker";

afterEach(cleanup);

describe("ProfilePicker", () => {
  it("selects a child but does not open the child session itself", () => {
    const onSelect = vi.fn();

    render(<ProfilePicker children={createDemoSeed().children} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Choose Alex"));

    expect(onSelect).toHaveBeenCalledWith("20000000-0000-4000-8000-000000000001");
    expect(screen.getByText("Who is using Fovari?")).toBeInTheDocument();
  });

  it("explains whether a profile opens through a secure PIN screen", () => {
    const children = createDemoSeed().children.map((child, index) => ({
      ...child,
      pinConfigured: index === 0,
    }));

    render(<ProfilePicker children={children} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Choose Alex" })).toHaveTextContent("PIN protected");
    expect(screen.getByRole("button", { name: "Choose June" })).toHaveTextContent("Ready to open");
  });

  it("disables every profile while selection is in flight", () => {
    const onSelect = vi.fn();

    render(<ProfilePicker children={createDemoSeed().children} disabled onSelect={onSelect} />);

    for (const profile of screen.getAllByRole("button", { name: /Choose/ })) {
      expect(profile).toBeDisabled();
      expect(profile).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(profile);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows a grown-up recovery action when no child profiles exist", () => {
    const onParentRecovery = vi.fn();

    render(<ProfilePicker children={[]} onParentRecovery={onParentRecovery} onSelect={vi.fn()} />);

    expect(screen.getByText("No child profiles are available.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ask a grown-up" }));
    expect(onParentRecovery).toHaveBeenCalledOnce();
  });
});
