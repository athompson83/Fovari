// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RouteGuard } from "./RouteGuard";

describe("RouteGuard", () => {
  afterEach(cleanup);

  it("renders adult content only for an adult session", () => {
    render(
      <RouteGuard
        allow="adult"
        onRecover={() => undefined}
        session={{ actorId: "adult-1", kind: "adult" }}
      >
        <Text>Private adult content</Text>
      </RouteGuard>,
    );

    expect(screen.getByText("Private adult content")).toBeInTheDocument();
  });

  it("renders a non-privileged recovery action for a child session", () => {
    render(
      <RouteGuard
        allow="adult"
        onRecover={() => undefined}
        session={{ actorId: "child-1", childId: "child-1", kind: "child" }}
      >
        <Text>Private adult content</Text>
      </RouteGuard>,
    );

    expect(screen.queryByText("Private adult content")).not.toBeInTheDocument();
    expect(screen.getByText("Grown-up access required")).toBeInTheDocument();
  });

  it("renders a loading state while the session is unresolved", () => {
    render(
      <RouteGuard allow="adult" onRecover={() => undefined} session={null}>
        <Text>Private adult content</Text>
      </RouteGuard>,
    );

    expect(screen.getByRole("progressbar", { name: "Loading family" })).toBeInTheDocument();
    expect(screen.queryByText("Private adult content")).not.toBeInTheDocument();
  });

  it("offers signed-out recovery and invokes the supplied callback", () => {
    const onRecover = vi.fn();
    render(
      <RouteGuard allow="adult" onRecover={onRecover} session={{ kind: "signed_out" }}>
        <Text>Private adult content</Text>
      </RouteGuard>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Return safely" }));
    expect(onRecover).toHaveBeenCalledOnce();
  });

  it("renders child content only for the matching child session", () => {
    render(
      <RouteGuard
        allow="child"
        onRecover={() => undefined}
        session={{ actorId: "child-1", childId: "child-1", kind: "child" }}
      >
        <Text>Private child content</Text>
      </RouteGuard>,
    );

    expect(screen.getByText("Private child content")).toBeInTheDocument();
  });

  it("keeps adult sessions out of child content and invokes child recovery", () => {
    const onRecover = vi.fn();
    render(
      <RouteGuard
        allow="child"
        onRecover={onRecover}
        session={{ actorId: "adult-1", kind: "adult" }}
      >
        <Text>Private child content</Text>
      </RouteGuard>,
    );

    expect(screen.queryByText("Private child content")).not.toBeInTheDocument();
    expect(screen.getByText("Choose a child profile")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return safely" }));
    expect(onRecover).toHaveBeenCalledOnce();
  });
});
