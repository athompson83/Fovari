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
});
