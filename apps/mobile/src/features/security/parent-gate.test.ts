import { describe, expect, it } from "vitest";

import { createParentGate } from "./parent-gate";

describe("parent gate", () => {
  it("rate-limits repeated failures and unlocks only with the adult answer", () => {
    const gate = createParentGate({ answer: "12", maxAttempts: 3, lockoutMs: 30_000 });

    expect(gate.attempt("1", 1_000)).toEqual({ ok: false, remainingAttempts: 2 });
    expect(gate.attempt("2", 2_000)).toEqual({ ok: false, remainingAttempts: 1 });
    expect(gate.attempt("3", 3_000)).toEqual({
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });
    expect(gate.attempt("12", 4_000)).toEqual({
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });
    expect(gate.attempt("12", 33_001)).toEqual({ ok: true, remainingAttempts: 3 });
  });
});
