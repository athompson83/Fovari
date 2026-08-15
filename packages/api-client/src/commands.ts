export interface CommandContext {
  readonly actorId: string;
  readonly familyId: string;
  readonly idempotencyKey: string;
}

export function createCommandContext(input: CommandContext): CommandContext {
  const actorId = input.actorId.trim();
  const familyId = input.familyId.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  if (!actorId) {
    throw new Error("actorId is required");
  }

  if (!familyId) {
    throw new Error("familyId is required");
  }

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required");
  }

  return Object.freeze({ actorId, familyId, idempotencyKey });
}
