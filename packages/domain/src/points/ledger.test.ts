import { describe, expect, it } from "vitest";

import { reducePointLedger, type PointTransaction } from "./ledger";

const transaction = (
  id: string,
  amount: number,
  type: PointTransaction["type"],
): PointTransaction => ({
  amount,
  description: id,
  id,
  idempotencyKey: `key-${id}`,
  occurredAt: "2026-07-24T12:00:00.000Z",
  type,
});

describe("reducePointLedger", () => {
  it("derives balance and lifetime totals from append-only entries", () => {
    const ledger = [
      transaction("reading", 100, "goal_reward"),
      transaction("bonus", 25, "bonus"),
      transaction("movie", -75, "redemption"),
    ];

    expect(reducePointLedger(ledger)).toEqual({
      balance: 50,
      lifetimeEarned: 125,
      lifetimeSpent: 75,
      transactionCount: 3,
    });
    expect(ledger).toHaveLength(3);
  });

  it("rejects a duplicate idempotency key before changing the projection", () => {
    const first = transaction("reading", 20, "goal_reward");
    const duplicate = {
      ...transaction("reading-retry", 20, "goal_reward"),
      idempotencyKey: first.idempotencyKey,
    };

    expect(() => reducePointLedger([first, duplicate])).toThrow("Duplicate point transaction");
  });

  it("rejects any ledger history that would overdraw the account", () => {
    expect(() => reducePointLedger([transaction("movie", -50, "redemption")])).toThrow(
      "Point account cannot be overdrawn",
    );
  });

  it("uses a reversal entry instead of mutating the original transaction", () => {
    const award = transaction("reading", 20, "goal_reward");
    const reversal: PointTransaction = {
      ...transaction("reading-reversal", -20, "reversal"),
      reversesTransactionId: award.id,
    };

    expect(reducePointLedger([award, reversal])).toEqual({
      balance: 0,
      lifetimeEarned: 20,
      lifetimeSpent: 20,
      transactionCount: 2,
    });
    expect(award.amount).toBe(20);
  });
});
