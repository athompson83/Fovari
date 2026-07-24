import { describe, expect, it } from "vitest";

import { createCommandContext } from "./commands";
import type { FamilySnapshot } from "./family-repository";

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

it("models one explicit signed-out, adult, or child session", () => {
  const sessions: FamilySnapshot["session"][] = [
    { kind: "signed_out" },
    { actorId: "adult-1", kind: "adult" },
    { actorId: "child-1", childId: "child-1", kind: "child" },
  ];

  expect(sessions.map((session) => session.kind)).toEqual(["signed_out", "adult", "child"]);
});
