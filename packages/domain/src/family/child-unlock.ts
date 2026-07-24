export type ChildUnlockDecision =
  | { failures: number; ok: true }
  | {
      failures: number;
      lockedUntil?: number;
      ok: false;
      remainingAttempts: number;
    };

export interface ChildUnlockInput {
  configured: boolean;
  failures: number;
  lockedUntil?: number | undefined;
  matches: boolean;
  now: number;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000;

export function attemptChildUnlock(input: ChildUnlockInput): ChildUnlockDecision {
  if (!input.configured) return { failures: 0, ok: true };

  if (input.lockedUntil !== undefined && input.now < input.lockedUntil) {
    return {
      failures: input.failures,
      lockedUntil: input.lockedUntil,
      ok: false,
      remainingAttempts: 0,
    };
  }

  if (input.matches) return { failures: 0, ok: true };

  const failures = (input.lockedUntil !== undefined ? 0 : input.failures) + 1;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failures);
  if (remainingAttempts === 0) {
    return {
      failures,
      lockedUntil: input.now + LOCKOUT_MS,
      ok: false,
      remainingAttempts,
    };
  }

  return { failures, ok: false, remainingAttempts };
}
