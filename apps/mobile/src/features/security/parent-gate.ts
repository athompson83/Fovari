export type ParentGateResult =
  | { ok: true; remainingAttempts: number }
  | { lockedUntil?: number; ok: false; remainingAttempts: number };

interface ParentGateOptions {
  answer: string;
  lockoutMs: number;
  maxAttempts: number;
}

export function createParentGate(options: ParentGateOptions) {
  let failures = 0;
  let lockedUntil: number | null = null;

  return {
    attempt(answer: string, now: number): ParentGateResult {
      if (lockedUntil !== null && now < lockedUntil) {
        return { lockedUntil, ok: false, remainingAttempts: 0 };
      }
      if (lockedUntil !== null) {
        failures = 0;
        lockedUntil = null;
      }

      if (answer.trim() === options.answer) {
        failures = 0;
        return { ok: true, remainingAttempts: options.maxAttempts };
      }

      failures += 1;
      const remainingAttempts = Math.max(0, options.maxAttempts - failures);
      if (remainingAttempts === 0) {
        lockedUntil = now + options.lockoutMs;
        return { lockedUntil, ok: false, remainingAttempts };
      }
      return { ok: false, remainingAttempts };
    },
  };
}
