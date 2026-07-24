import { err, ok, type Result } from "@fovari/domain";

export type OfflineCommandType =
  | "save_checklist"
  | "save_evidence_metadata"
  | "save_timer"
  | "select_reward"
  | "submit_completion";

export type OfflineActionStatus =
  "pending" | "syncing" | "retryable_error" | "completed" | "permanent_error";

export interface NewOfflineAction {
  actorId: string;
  commandType: OfflineCommandType;
  createdAt: string;
  entityId: string;
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface OfflineAction extends NewOfflineAction {
  attemptCount: number;
  completedAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  status: OfflineActionStatus;
}

export interface OfflineQueueError {
  code: "duplicate_command";
  message: string;
}

export interface OfflineQueue {
  enqueue(action: NewOfflineAction): Result<OfflineAction, OfflineQueueError>;
  listAll(): readonly OfflineAction[];
  listPending(): readonly OfflineAction[];
  markComplete(idempotencyKey: string, at: string): void;
  markPermanentFailure(idempotencyKey: string, error: string, at: string): void;
  markRetryable(idempotencyKey: string, error: string, at: string): void;
  markSyncing(idempotencyKey: string, at: string): void;
}

const clone = (action: OfflineAction): OfflineAction => structuredClone(action);

export function createOfflineQueue(initial: readonly OfflineAction[] = []): OfflineQueue {
  const actions = new Map(initial.map((action) => [action.idempotencyKey, clone(action)]));

  const find = (idempotencyKey: string): OfflineAction => {
    const action = actions.get(idempotencyKey);
    if (!action) {
      throw new Error(`Offline action not found: ${idempotencyKey}`);
    }
    return action;
  };

  return {
    enqueue(action) {
      if (actions.has(action.idempotencyKey)) {
        return err({
          code: "duplicate_command",
          message: "This offline command is already queued.",
        });
      }

      const queued: OfflineAction = {
        ...structuredClone(action),
        attemptCount: 0,
        status: "pending",
      };
      actions.set(action.idempotencyKey, queued);
      return ok(clone(queued));
    },
    listAll() {
      return [...actions.values()].map(clone);
    },
    listPending() {
      return [...actions.values()]
        .filter((action) => action.status === "pending" || action.status === "retryable_error")
        .map(clone);
    },
    markComplete(idempotencyKey, at) {
      const action = find(idempotencyKey);
      action.completedAt = at;
      action.status = "completed";
      delete action.lastError;
    },
    markPermanentFailure(idempotencyKey, error, at) {
      const action = find(idempotencyKey);
      action.lastAttemptAt = at;
      action.lastError = error;
      action.status = "permanent_error";
    },
    markRetryable(idempotencyKey, error, at) {
      const action = find(idempotencyKey);
      action.lastAttemptAt = at;
      action.lastError = error;
      action.status = "retryable_error";
    },
    markSyncing(idempotencyKey, at) {
      const action = find(idempotencyKey);
      action.attemptCount += 1;
      action.lastAttemptAt = at;
      action.status = "syncing";
      delete action.lastError;
    },
  };
}
