// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WelcomeScreen } from "./WelcomeScreen";

describe("Fovari welcome", () => {
  it("communicates the family promise and provides a working demo entry", () => {
    const onDemo = vi.fn();
    render(<WelcomeScreen onDemo={onDemo} />);

    expect(screen.getByText("Fovari")).toBeInTheDocument();
    expect(screen.getByText("Grow together.")).toBeInTheDocument();
    expect(screen.getByText("Celebrate every win.")).toBeInTheDocument();
    expect(screen.getByText("Built for families. Designed for kids.")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Explore the family demo" }));
    expect(onDemo).toHaveBeenCalledTimes(1);
  });
});
