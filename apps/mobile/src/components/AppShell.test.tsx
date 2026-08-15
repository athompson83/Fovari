// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WelcomeScreen } from "./WelcomeScreen";

describe("Fovari welcome", () => {
  afterEach(cleanup);
  it("communicates the family promise and provides a working demo entry", () => {
    const onCreateAccount = vi.fn();
    const onDemo = vi.fn();
    const onOpenLink = vi.fn();
    render(
      <WelcomeScreen onCreateAccount={onCreateAccount} onDemo={onDemo} onOpenLink={onOpenLink} />,
    );

    expect(screen.getByText("Fovari")).toBeInTheDocument();
    expect(screen.getByText("Grow together.")).toBeInTheDocument();
    expect(screen.getByText("Celebrate every win.")).toBeInTheDocument();
    expect(screen.getByText("Built for families. Designed for kids.")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Explore the family demo" }));
    fireEvent.click(screen.getByRole("button", { name: "Create family account" }));
    fireEvent.click(screen.getByRole("link", { name: "Privacy" }));
    expect(onDemo).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onOpenLink).toHaveBeenCalledWith("Privacy");
  });

  it("offers a returning family a direct continuation path", () => {
    const onReturn = vi.fn();
    render(
      <WelcomeScreen
        onCreateAccount={vi.fn()}
        onDemo={vi.fn()}
        onOpenLink={vi.fn()}
        onReturn={onReturn}
        returningFamilyName="The Park Family"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with The Park Family" }));

    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
