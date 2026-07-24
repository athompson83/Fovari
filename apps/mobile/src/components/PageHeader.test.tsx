// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  return {
    ...actual,
    useWindowDimensions: () => ({
      fontScale: 1,
      height: 844,
      scale: 1,
      width: 390,
    }),
  };
});

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  afterEach(cleanup);

  it("stacks the action below the heading at 390px without forcing title truncation", () => {
    render(
      <PageHeader
        actionLabel="Family settings"
        onAction={vi.fn()}
        subtitle="The Park Family"
        title="Family"
      />,
    );

    expect(screen.getByTestId("page-header")).toHaveStyle({
      alignItems: "stretch",
      flexDirection: "column",
    });
    expect(screen.getByTestId("page-header-heading")).toHaveStyle({
      flexDirection: "row",
    });
    expect(screen.getByText("Family")).not.toHaveStyle({ whiteSpace: "nowrap" });
    expect(screen.getByRole("button", { name: "Family settings" })).toHaveStyle({
      alignSelf: "stretch",
    });
  });
});
