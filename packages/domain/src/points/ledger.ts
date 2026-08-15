export type PointTransactionType =
  | "goal_reward"
  | "bonus"
  | "manual_award"
  | "redemption"
  | "refund"
  | "adjustment"
  | "expiration"
  | "reversal";

export interface PointTransaction {
  childId: string;
  id: string;
  idempotencyKey: string;
  type: PointTransactionType;
  amount: number;
  description: string;
  occurredAt: string;
  reversesTransactionId?: string;
}

export interface PointAccountProjection {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactionCount: number;
}

export function reducePointLedger(
  transactions: readonly PointTransaction[],
): PointAccountProjection {
  let balance = 0;
  let lifetimeEarned = 0;
  let lifetimeSpent = 0;
  const idempotencyKeys = new Set<string>();
  const transactionIds = new Set<string>();

  for (const entry of transactions) {
    if (idempotencyKeys.has(entry.idempotencyKey)) {
      throw new Error(`Duplicate point transaction: ${entry.idempotencyKey}`);
    }

    if (transactionIds.has(entry.id)) {
      throw new Error(`Duplicate point transaction id: ${entry.id}`);
    }

    if (!Number.isSafeInteger(entry.amount) || entry.amount === 0) {
      throw new Error("Point transaction amount must be a non-zero safe integer");
    }

    if (entry.type === "reversal") {
      if (!entry.reversesTransactionId || !transactionIds.has(entry.reversesTransactionId)) {
        throw new Error("A reversal must reference an earlier point transaction");
      }
    }

    const nextBalance = balance + entry.amount;
    if (nextBalance < 0) {
      throw new Error("Point account cannot be overdrawn");
    }

    balance = nextBalance;
    if (entry.amount > 0) {
      lifetimeEarned += entry.amount;
    } else {
      lifetimeSpent += Math.abs(entry.amount);
    }

    idempotencyKeys.add(entry.idempotencyKey);
    transactionIds.add(entry.id);
  }

  return {
    balance,
    lifetimeEarned,
    lifetimeSpent,
    transactionCount: transactions.length,
  };
}
