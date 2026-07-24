import { describe, expect, it } from "vitest";

import { generateDailyOccurrences } from "./occurrence";

describe("generateDailyOccurrences", () => {
  it("creates stable idempotent occurrence keys for a rolling window", () => {
    const input = {
      assignmentId: "assignment-reading",
      childId: "child-alex",
      pointValue: 15,
      startDate: "2026-07-24",
      windowDays: 3,
    } as const;

    const first = generateDailyOccurrences(input);
    const replay = generateDailyOccurrences(input);

    expect(first).toEqual(replay);
    expect(first.map((occurrence) => occurrence.idempotencyKey)).toEqual([
      "assignment-reading:2026-07-24",
      "assignment-reading:2026-07-25",
      "assignment-reading:2026-07-26",
    ]);
  });

  it("generates only selected weekdays without changing the window boundary", () => {
    const occurrences = generateDailyOccurrences({
      assignmentId: "assignment-homework",
      childId: "child-alex",
      pointValue: 20,
      startDate: "2026-07-24",
      weekdays: [1, 2, 3, 4, 5],
      windowDays: 7,
    });

    expect(occurrences.map((occurrence) => occurrence.scheduledFor)).toEqual([
      "2026-07-24",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
    ]);
  });

  it("rejects malformed calendar dates and unsafe point values", () => {
    expect(() =>
      generateDailyOccurrences({
        assignmentId: "assignment",
        childId: "child",
        pointValue: -1,
        startDate: "not-a-date",
        windowDays: 1,
      }),
    ).toThrow("valid ISO calendar date");
  });
});
