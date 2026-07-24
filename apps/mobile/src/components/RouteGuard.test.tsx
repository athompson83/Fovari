// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { afterEach, describe, expect, it } from "vitest";

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
});
