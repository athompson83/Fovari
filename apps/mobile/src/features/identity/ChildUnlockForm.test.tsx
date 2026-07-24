// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { ChildUnlockForm } from "./ChildUnlockForm";

afterEach(cleanup);

describe("ChildUnlockForm", () => {
  it("reports a wrong protected PIN and clears the entry after the result", async () => {
    const unlockChild = vi
      .fn()
      .mockRejectedValueOnce(new Error("That PIN does not match. 2 tries left."));

    render(
      <ChildUnlockForm
        child={{ ...createDemoSeed().children[0]!, pinConfigured: true }}
        unlockChild={unlockChild}
      />,
    );

    const pinField = screen.getByLabelText("Alex PIN");
    fireEvent.change(pinField, { target: { value: "1111" } });
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    expect(await screen.findByText("That PIN does not match. 2 tries left.")).toBeInTheDocument();
    expect(unlockChild).toHaveBeenCalledWith({
      childId: "20000000-0000-4000-8000-000000000001",
      now: expect.any(Number),
      pin: "1111",
    });
    expect(pinField).toHaveValue("");
  });

  it("opens an unprotected profile through unlockChild without rendering a PIN field", async () => {
    const snapshot = {
      ...createDemoSeed(),
      activeActor: {
        childId: "20000000-0000-4000-8000-000000000001",
        id: "20000000-0000-4000-8000-000000000001",
        role: "child" as const,
      },
      session: {
        actorId: "20000000-0000-4000-8000-000000000001",
        childId: "20000000-0000-4000-8000-000000000001",
        kind: "child" as const,
      },
    };
    const unlockChild = vi.fn().mockResolvedValue(snapshot);
    const onUnlocked = vi.fn();

    render(
      <ChildUnlockForm
        child={{ ...createDemoSeed().children[0]!, pinConfigured: false }}
        onUnlocked={onUnlocked}
        unlockChild={unlockChild}
      />,
    );

    expect(screen.queryByLabelText("Alex PIN")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    await waitFor(() => {
      expect(unlockChild).toHaveBeenCalledWith({
        childId: "20000000-0000-4000-8000-000000000001",
        now: expect.any(Number),
      });
    });
    expect(onUnlocked).toHaveBeenCalledOnce();
  });

  it("does not enter child content unless the repository returns that child's session", async () => {
    const unlockChild = vi.fn().mockResolvedValue(createDemoSeed());
    const onUnlocked = vi.fn();

    render(
      <ChildUnlockForm
        child={{ ...createDemoSeed().children[0]!, pinConfigured: false }}
        onUnlocked={onUnlocked}
        unlockChild={unlockChild}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    expect(
      await screen.findByText("Alex's child session could not be opened. Try again."),
    ).toBeInTheDocument();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it("formats repository lockout errors and offers parent recovery", async () => {
    const unlockChild = vi
      .fn()
      .mockRejectedValue(new Error("Profile locked until 2030-01-02T15:04:05.000Z"));
    const onParentRecovery = vi.fn();

    render(
      <ChildUnlockForm
        child={{ ...createDemoSeed().children[0]!, pinConfigured: true }}
        onParentRecovery={onParentRecovery}
        unlockChild={unlockChild}
      />,
    );

    fireEvent.change(screen.getByLabelText("Alex PIN"), { target: { value: "1111" } });
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    expect(await screen.findByText(/Profile locked\. Try again at/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ask a grown-up" }));
    expect(onParentRecovery).toHaveBeenCalledOnce();
  });
});
