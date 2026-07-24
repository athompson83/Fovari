// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FamilySnapshot } from "@fovari/api-client";

import { createDemoSeed } from "../../data/fixtures";
import { ChildUnlockForm } from "./ChildUnlockForm";

afterEach(cleanup);

const childId = "20000000-0000-4000-8000-000000000001";

function createUnlockedChildSnapshot(): FamilySnapshot {
  return {
    ...createDemoSeed(),
    activeActor: { childId, id: childId, role: "child" },
    activeChildId: childId,
    session: { actorId: childId, childId, kind: "child" },
  };
}

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
    expect(screen.getByRole("alert")).toHaveTextContent("That PIN does not match. 2 tries left.");
    expect(unlockChild).toHaveBeenCalledWith({
      childId: "20000000-0000-4000-8000-000000000001",
      now: expect.any(Number),
      pin: "1111",
    });
    expect(pinField).toHaveValue("");
  });

  it("opens an unprotected profile through unlockChild without rendering a PIN field", async () => {
    const unlockChild = vi.fn().mockResolvedValue(createUnlockedChildSnapshot());
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

  it.each([
    [
      "session kind",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        session: { actorId: snapshot.adult.id, kind: "adult" },
      }),
    ],
    [
      "session childId",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        session: { actorId: childId, childId: snapshot.children[1]!.id, kind: "child" },
      }),
    ],
    [
      "session actorId",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        session: { actorId: snapshot.children[1]!.id, childId, kind: "child" },
      }),
    ],
    [
      "activeChildId",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        activeChildId: snapshot.children[1]!.id,
      }),
    ],
    [
      "active actor id",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        activeActor: { childId, id: snapshot.children[1]!.id, role: "child" },
      }),
    ],
    [
      "active actor childId",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        activeActor: { childId: snapshot.children[1]!.id, id: childId, role: "child" },
      }),
    ],
    [
      "active actor role",
      (snapshot: FamilySnapshot): FamilySnapshot => ({
        ...snapshot,
        activeActor: { id: snapshot.adult.id, role: "family_owner" },
      }),
    ],
  ])("does not enter child content when the returned %s does not match", async (_name, mutate) => {
    const unlockChild = vi.fn().mockResolvedValue(mutate(createUnlockedChildSnapshot()));
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

  it.each(["", "123", "1234567"])(
    "rejects an invalid configured PIN locally without consuming an attempt: %j",
    async (pin) => {
      const unlockChild = vi.fn();

      render(
        <ChildUnlockForm
          child={{ ...createDemoSeed().children[0]!, pinConfigured: true }}
          unlockChild={unlockChild}
        />,
      );

      if (pin) {
        fireEvent.change(screen.getByLabelText("Alex PIN"), { target: { value: pin } });
      }
      fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Use a 4 to 6 digit PIN.");
      expect(unlockChild).not.toHaveBeenCalled();
    },
  );

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
