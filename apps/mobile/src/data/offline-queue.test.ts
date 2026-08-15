import { describe, expect, it } from "vitest";

import { createOfflineQueue } from "./offline-queue";

describe("offline command queue", () => {
  it("deduplicates by client key and records retry state", () => {
    const queue = createOfflineQueue();
    const command = {
      actorId: "child-alex",
      commandType: "submit_completion",
      createdAt: "2026-07-24T12:00:00.000Z",
      entityId: "reading-goal",
      idempotencyKey: "offline-reading-1",
      payload: { note: "Done" },
    } as const;

    expect(queue.enqueue(command).ok).toBe(true);
    expect(queue.enqueue(command)).toMatchObject({
      error: { code: "duplicate_command" },
      ok: false,
    });

    queue.markSyncing(command.idempotencyKey, "2026-07-24T12:05:00.000Z");
    queue.markRetryable(command.idempotencyKey, "network_unavailable", "2026-07-24T12:05:01.000Z");

    expect(queue.listPending()).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastError: "network_unavailable",
        status: "retryable_error",
      }),
    ]);
  });

  it("does not return completed or permanent failures as pending work", () => {
    const queue = createOfflineQueue();
    const base = {
      actorId: "child-alex",
      commandType: "submit_completion" as const,
      createdAt: "2026-07-24T12:00:00.000Z",
      entityId: "reading-goal",
      payload: {},
    };

    queue.enqueue({ ...base, idempotencyKey: "complete-me" });
    queue.enqueue({ ...base, idempotencyKey: "revoke-me" });
    queue.markComplete("complete-me", "2026-07-24T12:10:00.000Z");
    queue.markPermanentFailure("revoke-me", "actor_revoked", "2026-07-24T12:11:00.000Z");

    expect(queue.listPending()).toEqual([]);
    expect(queue.listAll()).toHaveLength(2);
  });
});
