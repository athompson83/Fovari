// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
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

vi.mock("../../hooks/use-family", async () => {
  const React = await import("react");
  return {
    useFamilyAction: () => {
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);
      const run = React.useCallback(
        async (action: () => Promise<ReturnType<typeof createDemoSeed>>) => {
          setBusy(true);
          setError(null);
          try {
            return await action();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Something went wrong.");
            throw cause;
          } finally {
            setBusy(false);
          }
        },
        [],
      );
      return { busy, error, repository: routeMocks.repository, run };
    },
    useFamilySnapshot: () => routeMocks.snapshot,
  };
});

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

  it("guards rapid profile choices and routes once with the persisted selection", async () => {
    let resolveSelection!: (snapshot: ReturnType<typeof createDemoSeed>) => void;
    routeMocks.repository.selectChild.mockReturnValue(
      new Promise((resolve) => {
        resolveSelection = resolve;
      }),
    );

    render(<SelectProfileRoute />);
    const alex = screen.getByRole("button", { name: "Choose Alex" });
    const june = screen.getByRole("button", { name: "Choose June" });

    act(() => {
      alex.click();
      june.click();
    });

    expect(routeMocks.repository.selectChild).toHaveBeenCalledOnce();
    expect(routeMocks.repository.selectChild).toHaveBeenCalledWith(DEMO_IDS.alex);
    expect(alex).toBeDisabled();
    expect(june).toBeDisabled();

    resolveSelection({ ...createDemoSeed(), activeChildId: DEMO_IDS.alex });

    await waitFor(() => {
      expect(routeMocks.push).toHaveBeenCalledOnce();
      expect(routeMocks.push).toHaveBeenCalledWith(
        `/(child)/unlock?childId=${encodeURIComponent(DEMO_IDS.alex)}`,
      );
    });
  });

  it("does not navigate when profile selection resolves after route unmount", async () => {
    let resolveSelection!: (snapshot: ReturnType<typeof createDemoSeed>) => void;
    routeMocks.repository.selectChild.mockReturnValue(
      new Promise((resolve) => {
        resolveSelection = resolve;
      }),
    );

    const { unmount } = render(<SelectProfileRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Alex" }));
    expect(routeMocks.repository.selectChild).toHaveBeenCalledOnce();
    unmount();

    await act(async () => {
      resolveSelection({ ...createDemoSeed(), activeChildId: DEMO_IDS.alex });
      await Promise.resolve();
    });

    expect(routeMocks.push).not.toHaveBeenCalled();
  });

  it("keeps profile selection active across a StrictMode effect replay", async () => {
    routeMocks.repository.selectChild.mockResolvedValue({
      ...createDemoSeed(),
      activeChildId: DEMO_IDS.alex,
    });

    render(
      <StrictMode>
        <SelectProfileRoute />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose Alex" }));

    await waitFor(() => {
      expect(routeMocks.push).toHaveBeenCalledWith(
        `/(child)/unlock?childId=${encodeURIComponent(DEMO_IDS.alex)}`,
      );
    });
  });

  it("shows profile-selection failure without navigating and allows retry", async () => {
    routeMocks.repository.selectChild
      .mockRejectedValueOnce(new Error("Profile selection failed."))
      .mockResolvedValueOnce({ ...createDemoSeed(), activeChildId: DEMO_IDS.alex });

    render(<SelectProfileRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Alex" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Profile selection failed.");
    expect(routeMocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Choose Alex" }));
    await waitFor(() => {
      expect(routeMocks.repository.selectChild).toHaveBeenCalledTimes(2);
      expect(routeMocks.push).toHaveBeenCalledOnce();
    });
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

  it("does not navigate when parent sign-out resolves after route unmount", async () => {
    let resolveSignOut!: (snapshot: ReturnType<typeof createDemoSeed>) => void;
    routeMocks.repository.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    const { unmount } = render(<FamilyRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Hand off to Alex" }));
    expect(routeMocks.repository.signOut).toHaveBeenCalledOnce();
    unmount();

    await act(async () => {
      resolveSignOut({ ...createDemoSeed(), session: { kind: "signed_out" } });
      await Promise.resolve();
    });

    expect(routeMocks.replace).not.toHaveBeenCalled();
  });

  it("keeps parent handoff active across a StrictMode effect replay", async () => {
    routeMocks.repository.signOut.mockResolvedValue({
      ...createDemoSeed(),
      session: { kind: "signed_out" },
    });

    render(
      <StrictMode>
        <FamilyRoute />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hand off to Alex" }));

    await waitFor(() => {
      expect(routeMocks.replace).toHaveBeenCalledWith("/(child)/select-profile");
    });
  });

  it("announces a parent handoff failure, does not navigate, and allows retry", async () => {
    routeMocks.repository.signOut
      .mockRejectedValueOnce(new Error("Parent handoff failed."))
      .mockResolvedValueOnce({ ...createDemoSeed(), session: { kind: "signed_out" } });

    render(<FamilyRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Hand off to Alex" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Parent handoff failed.");
    expect(routeMocks.replace).not.toHaveBeenCalled();

    const retry = screen.getByRole("button", { name: "Hand off to Alex" });
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await waitFor(() => {
      expect(routeMocks.repository.signOut).toHaveBeenCalledTimes(2);
      expect(routeMocks.replace).toHaveBeenCalledOnce();
    });
  });

  it("reuses the unlock route when kiosk opens the selected child space", () => {
    render(<KioskRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Open Alex's space" }));

    expect(routeMocks.push).toHaveBeenCalledWith(
      `/(child)/unlock?childId=${encodeURIComponent(DEMO_IDS.alex)}`,
    );
    expect(routeMocks.repository.switchActor).not.toHaveBeenCalled();
  });

  it("guards rapid kiosk profile selection while persistence is in flight", async () => {
    let resolveSelection!: (snapshot: ReturnType<typeof createDemoSeed>) => void;
    routeMocks.repository.selectChild.mockReturnValue(
      new Promise((resolve) => {
        resolveSelection = resolve;
      }),
    );

    render(<KioskRoute />);
    const alex = screen.getByRole("button", { name: "Select Alex" });
    const june = screen.getByRole("button", { name: "Select June" });

    act(() => {
      alex.click();
      june.click();
    });

    expect(routeMocks.repository.selectChild).toHaveBeenCalledOnce();
    expect(routeMocks.repository.selectChild).toHaveBeenCalledWith(DEMO_IDS.alex);
    expect(alex).toBeDisabled();
    expect(june).toBeDisabled();

    resolveSelection({ ...createDemoSeed(), activeChildId: DEMO_IDS.alex });
    await waitFor(() => expect(alex).not.toBeDisabled());
  });

  it("announces a kiosk selection failure and allows retry", async () => {
    routeMocks.repository.selectChild
      .mockRejectedValueOnce(new Error("Kiosk selection failed."))
      .mockResolvedValueOnce({ ...createDemoSeed(), activeChildId: DEMO_IDS.alex });

    render(<KioskRoute />);
    fireEvent.click(screen.getByRole("button", { name: "Select Alex" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Kiosk selection failed.");
    fireEvent.click(screen.getByRole("button", { name: "Select Alex" }));
    await waitFor(() => expect(routeMocks.repository.selectChild).toHaveBeenCalledTimes(2));
  });

  it("shows a safe grown-up recovery state when kiosk has no children", () => {
    routeMocks.snapshot = { ...createDemoSeed(), children: [] };

    render(<KioskRoute />);

    expect(screen.getByText("No child profiles are available.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ask a grown-up" }));
    expect(routeMocks.push).toHaveBeenCalledWith("/(child)/parent-gate");
  });
});
