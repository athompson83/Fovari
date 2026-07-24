import { describe, expect, it } from "vitest";

import { createCommandContext } from "./commands";

describe("command context", () => {
  it("requires an actor, family, and stable idempotency key", () => {
    expect(() =>
      createCommandContext({
        actorId: "",
        familyId: "family",
        idempotencyKey: "command",
      }),
    ).toThrow("actorId");

    expect(() =>
      createCommandContext({
        actorId: "adult",
        familyId: "",
        idempotencyKey: "command",
      }),
    ).toThrow("familyId");

    expect(() =>
      createCommandContext({
        actorId: "adult",
        familyId: "family",
        idempotencyKey: " ",
      }),
    ).toThrow("idempotencyKey");
  });

  it("returns a trimmed immutable command envelope", () => {
    expect(
      createCommandContext({
        actorId: " adult ",
        familyId: " family ",
        idempotencyKey: " command ",
      }),
    ).toEqual({
      actorId: "adult",
      familyId: "family",
      idempotencyKey: "command",
    });
  });
});
