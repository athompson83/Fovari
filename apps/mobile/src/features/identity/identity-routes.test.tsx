// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDemoSeed, DEMO_IDS } from "../../data/fixtures";
import SelectProfileRoute from "../../../app/(child)/select-profile";
import UnlockRoute from "../../../app/(child)/unlock";
import KioskRoute from "../../../app/(kiosk)";
import FamilyRoute from "../../../app/(parent)/(tabs)/family";

const routeMocks = vi.hoisted(() => ({
  params: { childId: "20000000-0000-4000-8000-000000000001" },
  push: vi.fn(),
  replace: vi.fn(),
  repository: {
    selectChild: vi.fn(),
    signOut: vi.fn(),
    switchActor: vi.fn(),
    unlockChild: vi.fn(),
  },
  snapshot: null as ReturnType<typeof createDemoSeed> | null,
}));

vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => <div>Redirect to {href}</div>,
  useLocalSearchParams: () => routeMocks.params,
  useRouter: () => ({
    push: routeMocks.push,
    replace: routeMocks.replace,
  }),
}));

vi.mock("../../hooks/use-family", () => ({
  useFamilyAction: () => ({
    busy: false,
    error: null,
    repository: routeMocks.repository,
    run: (action: () => Promise<ReturnType<typeof createDemoSeed>>) => action(),
  }),
  useFamilySnapshot: () => routeMocks.snapshot,
}));

afterEach(cleanup);

beforeEach(() => {
  routeMocks.snapshot = createDemoSeed();
  routeMocks.push.mockReset();
  routeMocks.replace.mockReset();
  routeMocks.repository.selectChild.mockReset();
  routeMocks.repository.signOut.mockReset();
  routeMocks.repository.switchActor.mockReset();
  routeMocks.repository.unlockChild.mockReset();
});

describe("child handoff routes", () => {
  it("selects a profile without creating a session, then routes through unlock", async () => {
    routeMocks.repository.selectChild.mockResolvedValue(createDemoSeed());

    render(<SelectProfileRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Alex" }));

    await waitFor(() => {
      expect(routeMocks.repository.selectChild).toHaveBeenCalledWith(DEMO_IDS.alex);
    });
    expect(routeMocks.repository.switchActor).not.toHaveBeenCalled();
    expect(routeMocks.push).toHaveBeenCalledWith(
      `/(child)/unlock?childId=${encodeURIComponent(DEMO_IDS.alex)}`,
    );
  });

  it("unlocks through the repository and enters child content only after success", async () => {
    const childSnapshot = {
      ...createDemoSeed(),
      activeActor: { childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" as const },
      session: {
        actorId: DEMO_IDS.alex,
        childId: DEMO_IDS.alex,
        kind: "child" as const,
      },
    };
    routeMocks.repository.unlockChild.mockResolvedValue(childSnapshot);

    render(<UnlockRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    await waitFor(() => {
      expect(routeMocks.repository.unlockChild).toHaveBeenCalledWith({
        childId: DEMO_IDS.alex,
        now: expect.any(Number),
      });
    });
    expect(routeMocks.replace).toHaveBeenCalledWith("/(child)/(tabs)/home");
  });

  it("signs the parent out before replacing the family route with the profile picker", async () => {
    let resolveSignOut!: (snapshot: ReturnType<typeof createDemoSeed>) => void;
    routeMocks.repository.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    render(<FamilyRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Hand off to Alex" }));

    expect(routeMocks.repository.signOut).toHaveBeenCalledOnce();
    expect(routeMocks.replace).not.toHaveBeenCalled();

    resolveSignOut({
      ...createDemoSeed(),
      session: { kind: "signed_out" },
    });

    await waitFor(() => {
      expect(routeMocks.replace).toHaveBeenCalledWith("/(child)/select-profile");
    });
    expect(routeMocks.repository.selectChild).not.toHaveBeenCalled();
    expect(routeMocks.repository.switchActor).not.toHaveBeenCalled();
  });

  it("reuses the unlock route when kiosk opens the selected child space", () => {
    render(<KioskRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    expect(routeMocks.push).toHaveBeenCalledWith(
      `/(child)/unlock?childId=${encodeURIComponent(DEMO_IDS.alex)}`,
    );
    expect(routeMocks.repository.switchActor).not.toHaveBeenCalled();
  });
});
