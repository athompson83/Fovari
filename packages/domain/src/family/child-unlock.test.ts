import { describe, expect, it } from "vitest";

import { attemptChildUnlock } from "./child-unlock";

describe("child unlock", () => {
  it("opens a profile without a configured PIN", () => {
    expect(
      attemptChildUnlock({
        configured: false,
        failures: 0,
        matches: false,
        now: 1_000,
      }),
    ).toEqual({ failures: 0, ok: true });
  });

  it("locks after three mismatches and recovers after the lockout", () => {
    const first = attemptChildUnlock({
      configured: true,
      failures: 0,
      matches: false,
      now: 1_000,
    });
    expect(first).toEqual({ failures: 1, ok: false, remainingAttempts: 2 });

    const second = attemptChildUnlock({
      configured: true,
      failures: first.failures,
      matches: false,
      now: 2_000,
    });
    if (second.ok) throw new Error("second mismatch must fail");

    const third = attemptChildUnlock({
      configured: true,
      failures: second.failures,
      matches: false,
      now: 3_000,
    });
    expect(third).toEqual({
      failures: 3,
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });
    if (third.ok) throw new Error("third mismatch must fail");

    expect(
      attemptChildUnlock({
        configured: true,
        failures: third.failures,
        lockedUntil: third.lockedUntil,
        matches: true,
        now: 4_000,
      }),
    ).toEqual({
      failures: 3,
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });

    expect(
      attemptChildUnlock({
        configured: true,
        failures: third.failures,
        lockedUntil: third.lockedUntil,
        matches: true,
        now: 33_001,
      }),
    ).toEqual({ failures: 0, ok: true });
  });
});
