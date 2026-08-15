// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Alert, Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const startupMocks = vi.hoisted(() => {
  type StartupState = {
    error: string | null;
    snapshot: null;
    status: "error" | "idle" | "loading" | "ready";
  };
  let state: StartupState = {
    error: "Invalid local family data. Reset the synthetic family to continue.",
    snapshot: null,
    status: "error",
  };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    recoverLocalData: vi.fn(),
    reset(next = state) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    setState(next: Partial<StartupState>) {
      state = { ...state, ...next };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("expo-router", () => ({
  Stack: () => <div>Family routes</div>,
}));

vi.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

vi.mock("../providers/AppProviders", async () => {
  const React = await import("react");
  return {
    AppProviders: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useAppServices: () => ({ recoverLocalData: startupMocks.recoverLocalData }),
    useFamilyStore: <T,>(selector: (state: ReturnType<typeof startupMocks.getState>) => T) =>
      React.useSyncExternalStore(
        startupMocks.subscribe,
        () => selector(startupMocks.getState()),
        () => selector(startupMocks.getState()),
      ),
  };
});

import RootLayout from "../../app/_layout";

const destructiveConfirmation = () => {
  const buttons = vi.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  return buttons.find((button) => button.style === "destructive");
};

describe("root initialization recovery", () => {
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    vi.spyOn(Alert, "alert").mockImplementation(vi.fn());
    startupMocks.reset({
      error: "Invalid local family data. Reset the synthetic family to continue.",
      snapshot: null,
      status: "error",
    });
    startupMocks.recoverLocalData.mockReset();
    startupMocks.recoverLocalData.mockImplementation(async () => {
      startupMocks.setState({ error: null, status: "ready" });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  });

  it.each([
    "Invalid local family data. Reset the synthetic family to continue.",
    "Unsupported local family data. Reset the synthetic family to continue.",
  ])("renders a recoverable root error instead of routes for %s", (error) => {
    startupMocks.reset({ error, snapshot: null, status: "error" });

    render(<RootLayout />);

    expect(screen.getByRole("alert")).toHaveTextContent(error);
    expect(screen.getByText("Local family needs recovery")).toBeInTheDocument();
    expect(screen.queryByText("Family routes")).not.toBeInTheDocument();
  });

  it("honors native cancellation and recovers only after destructive confirmation", async () => {
    render(<RootLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Clear local data and start over" }));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Clear local family data?",
      expect.stringContaining("saved synthetic family"),
      expect.any(Array),
    );
    expect(startupMocks.recoverLocalData).not.toHaveBeenCalled();

    act(() => destructiveConfirmation()?.onPress?.());

    await waitFor(() => expect(startupMocks.recoverLocalData).toHaveBeenCalledOnce());
    expect(await screen.findByText("Family routes")).toBeInTheDocument();
  });

  it("uses browser confirmation and respects cancellation", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);

    render(<RootLayout />);
    fireEvent.click(screen.getByRole("button", { name: "Clear local data and start over" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Clear local family data?"));
    expect(startupMocks.recoverLocalData).not.toHaveBeenCalled();
  });

  it("keeps the recovery state visible and announces cleanup failure", async () => {
    startupMocks.recoverLocalData.mockRejectedValueOnce(
      new Error("Secure storage cleanup failed."),
    );
    render(<RootLayout />);

    fireEvent.click(screen.getByRole("button", { name: "Clear local data and start over" }));
    act(() => destructiveConfirmation()?.onPress?.());

    expect(await screen.findByText("Secure storage cleanup failed.")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByText("Local family needs recovery")).toBeInTheDocument();
    expect(screen.queryByText("Family routes")).not.toBeInTheDocument();
  });
});
