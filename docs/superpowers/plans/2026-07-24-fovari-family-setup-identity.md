# Fovari Family Setup and Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the setup preview and redirect-only child selection with a resumable, persisted
local family onboarding and secure child-handoff journey.

**Architecture:** The existing `FamilyRepository` remains the only mutation boundary. Pure domain
modules govern onboarding order and PIN attempt limits; a versioned AsyncStorage envelope persists
the synthetic family and session, while an injected credential vault stores only salted PIN digests.
Parent and child route guards consume one repository-owned session state so UI redirects cannot
grant authority.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Router, TypeScript 6.0, Zod, Zustand,
AsyncStorage, Expo Crypto, Expo SecureStore, Vitest, Testing Library, and Playwright.

## Global Constraints

- Work only in `C:\Users\Adam\Documents\Fovari`.
- Keep all data synthetic and local; do not deploy, spend money, send messages, or connect a
  production service.
- Preserve the existing parent, child, reward, point-ledger, and RLS behavior.
- Store no raw adult secret or child PIN.
- Treat the web credential fallback as a synthetic local preview, never production security.
- Write every behavior test first and observe the expected failure before implementation.
- Keep external providers and real authentication disabled.
- End every task with focused verification and a dedicated commit.

---

### Task 1: Onboarding and child-unlock domain rules

**Files:**

- Create: `packages/domain/src/family/onboarding.ts`
- Create: `packages/domain/src/family/onboarding.test.ts`
- Create: `packages/domain/src/family/child-unlock.ts`
- Create: `packages/domain/src/family/child-unlock.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**

- Produces:
  - `createOnboardingState(): OnboardingState`
  - `completeOnboardingStep(state, step): Result<OnboardingState, OnboardingError>`
  - `attemptChildUnlock(input): ChildUnlockDecision`
- Consumes: the existing `Result`, `ok`, and `err` helpers from
  `packages/domain/src/shared/result.ts`.

- [ ] **Step 1: Write the failing onboarding transition tests**

```ts
import { describe, expect, it } from "vitest";

import { completeOnboardingStep, createOnboardingState } from "./onboarding";

describe("family onboarding", () => {
  it("advances only through the configured order", () => {
    const initial = createOnboardingState();
    const adult = completeOnboardingStep(initial, "adult");

    expect(adult).toEqual({
      ok: true,
      value: {
        completedSteps: ["adult"],
        currentStep: "family",
        status: "in_progress",
      },
    });
  });

  it("rejects skipped and repeated steps", () => {
    const initial = createOnboardingState();

    expect(completeOnboardingStep(initial, "children")).toMatchObject({
      error: { code: "step_out_of_order" },
      ok: false,
    });

    const adult = completeOnboardingStep(initial, "adult");
    if (!adult.ok) throw new Error("adult step must pass");

    expect(completeOnboardingStep(adult.value, "adult")).toMatchObject({
      error: { code: "step_out_of_order" },
      ok: false,
    });
  });

  it("marks setup complete after review", () => {
    let state = createOnboardingState();
    for (const step of [
      "adult",
      "family",
      "children",
      "starter_goals",
      "starter_rewards",
      "notifications",
      "review",
    ] as const) {
      const result = completeOnboardingStep(state, step);
      if (!result.ok) throw new Error(result.error.message);
      state = result.value;
    }

    expect(state.status).toBe("complete");
    expect(state.currentStep).toBe("complete");
  });
});
```

- [ ] **Step 2: Run the onboarding tests and verify the expected red state**

Run:

```powershell
pnpm --filter @fovari/domain test -- src/family/onboarding.test.ts
```

Expected: FAIL because `./onboarding` does not exist.

- [ ] **Step 3: Implement the onboarding state machine**

```ts
import { err, ok, type Result } from "../shared/result";

export const ONBOARDING_STEPS = [
  "adult",
  "family",
  "children",
  "starter_goals",
  "starter_rewards",
  "notifications",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number] | "complete";
export type OnboardingStatus = "not_started" | "in_progress" | "complete";

export interface OnboardingState {
  completedSteps: readonly Exclude<OnboardingStep, "complete">[];
  currentStep: OnboardingStep;
  status: OnboardingStatus;
}

export interface OnboardingError {
  code: "step_out_of_order";
  message: string;
}

export const createOnboardingState = (): OnboardingState => ({
  completedSteps: [],
  currentStep: "adult",
  status: "not_started",
});

export function completeOnboardingStep(
  state: OnboardingState,
  step: Exclude<OnboardingStep, "complete">,
): Result<OnboardingState, OnboardingError> {
  if (state.currentStep !== step || state.status === "complete") {
    return err({
      code: "step_out_of_order",
      message: `Complete ${state.currentStep} before ${step}.`,
    });
  }

  const completedSteps = [...state.completedSteps, step];
  const nextIndex = ONBOARDING_STEPS.indexOf(step) + 1;
  const currentStep = ONBOARDING_STEPS[nextIndex] ?? "complete";

  return ok({
    completedSteps,
    currentStep,
    status: currentStep === "complete" ? "complete" : "in_progress",
  });
}
```

- [ ] **Step 4: Run the onboarding tests and verify green**

Run:

```powershell
pnpm --filter @fovari/domain test -- src/family/onboarding.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Write the failing child-unlock tests**

```ts
import { describe, expect, it } from "vitest";

import { attemptChildUnlock } from "./child-unlock";

describe("child unlock", () => {
  it("opens a profile without a configured PIN", () => {
    expect(
      attemptChildUnlock({
        configured: false,
        failures: 0,
        matches: false,
        now: 1_000,
      }),
    ).toEqual({ failures: 0, ok: true });
  });

  it("locks after three mismatches and recovers after the lockout", () => {
    const first = attemptChildUnlock({
      configured: true,
      failures: 0,
      matches: false,
      now: 1_000,
    });
    expect(first).toEqual({ failures: 1, ok: false, remainingAttempts: 2 });

    const second = attemptChildUnlock({
      configured: true,
      failures: first.failures,
      matches: false,
      now: 2_000,
    });
    if (second.ok) throw new Error("second mismatch must fail");

    const third = attemptChildUnlock({
      configured: true,
      failures: second.failures,
      matches: false,
      now: 3_000,
    });
    expect(third).toEqual({
      failures: 3,
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });

    expect(
      attemptChildUnlock({
        configured: true,
        failures: third.failures,
        lockedUntil: third.lockedUntil,
        matches: true,
        now: 4_000,
      }),
    ).toEqual({
      failures: 3,
      lockedUntil: 33_000,
      ok: false,
      remainingAttempts: 0,
    });

    expect(
      attemptChildUnlock({
        configured: true,
        failures: third.failures,
        lockedUntil: third.lockedUntil,
        matches: true,
        now: 33_001,
      }),
    ).toEqual({ failures: 0, ok: true });
  });
});
```

- [ ] **Step 6: Run the child-unlock tests and verify the expected red state**

Run:

```powershell
pnpm --filter @fovari/domain test -- src/family/child-unlock.test.ts
```

Expected: FAIL because `./child-unlock` does not exist.

- [ ] **Step 7: Implement the pure child-unlock decision**

```ts
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
  lockedUntil?: number;
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
```

- [ ] **Step 8: Export the new domain interfaces and run the package gate**

Add these exports to `packages/domain/src/index.ts`:

```ts
export {
  completeOnboardingStep,
  createOnboardingState,
  ONBOARDING_STEPS,
} from "./family/onboarding";
export type {
  OnboardingError,
  OnboardingState,
  OnboardingStatus,
  OnboardingStep,
} from "./family/onboarding";
export { attemptChildUnlock } from "./family/child-unlock";
export type { ChildUnlockDecision, ChildUnlockInput } from "./family/child-unlock";
```

Run:

```powershell
pnpm --filter @fovari/domain test
pnpm --filter @fovari/domain typecheck
```

Expected: all domain tests and typecheck pass.

- [ ] **Step 9: Commit the domain rules**

```powershell
git add packages/domain/src
git commit -m "feat: add family setup identity rules"
```

---

### Task 2: Validated setup and session contracts

**Files:**

- Modify: `packages/validation/src/index.ts`
- Modify: `packages/validation/src/index.test.ts`
- Modify: `packages/api-client/src/family-repository.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/src/contracts.test.ts`

**Interfaces:**

- Consumes: `ExperienceMode`, `FamilyActor`, and `OnboardingState` from `@fovari/domain`.
- Produces:
  - `FamilySession`
  - `OnboardingDraft`
  - `NotificationPreferences`
  - `BeginFamilySetupInput`
  - `SaveOnboardingDraftInput`
  - `CompleteFamilySetupInput`
  - `ConfigureChildPinInput`
  - `UnlockChildInput`
  - new `FamilyRepository` session/setup commands.

- [ ] **Step 1: Write failing schema tests**

Append to `packages/validation/src/index.test.ts`:

```ts
import {
  ConfigureChildPinSchema,
  NotificationPreferencesSchema,
  OnboardingChildDraftSchema,
} from "./index";

it("accepts a synthetic child draft and strict optional PIN", () => {
  expect(
    OnboardingChildDraftSchema.parse({
      clientId: "child-draft-1",
      displayName: "Maya",
      experienceMode: "explorer",
      pinRequested: true,
    }),
  ).toMatchObject({ displayName: "Maya", pinRequested: true });

  expect(() =>
    ConfigureChildPinSchema.parse({
      childId: "20000000-0000-4000-8000-000000000001",
      pin: "12",
    }),
  ).toThrow();
});

it("requires valid quiet hours when notifications are enabled", () => {
  expect(
    NotificationPreferencesSchema.parse({
      approvalUpdates: true,
      childEncouragement: true,
      enabled: true,
      quietHoursEnd: "07:00",
      quietHoursStart: "20:30",
      weeklySummary: true,
    }),
  ).toMatchObject({ quietHoursStart: "20:30" });
});
```

- [ ] **Step 2: Run validation tests and verify red**

Run:

```powershell
pnpm --filter @fovari/validation test -- src/index.test.ts
```

Expected: FAIL because the new schemas are not exported.

- [ ] **Step 3: Add exact setup schemas and inferred input types**

Append to `packages/validation/src/index.ts`:

```ts
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const OnboardingChildDraftSchema = z.object({
  clientId: trimmedText(80),
  displayName: trimmedText(40),
  experienceMode: ExperienceModeSchema,
  pinRequested: z.boolean(),
});

export const NotificationPreferencesSchema = z.object({
  approvalUpdates: z.boolean(),
  childEncouragement: z.boolean(),
  enabled: z.boolean(),
  quietHoursEnd: localTime,
  quietHoursStart: localTime,
  weeklySummary: z.boolean(),
});

export const ConfigureChildPinSchema = z.object({
  childId: uuid,
  pin: z.string().regex(/^\d{4,6}$/, "Use a 4 to 6 digit PIN."),
});

export const UnlockChildSchema = z.object({
  childId: uuid,
  now: z.number().int().nonnegative(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
});

export type OnboardingChildDraftInput = z.infer<typeof OnboardingChildDraftSchema>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type ConfigureChildPinInput = z.infer<typeof ConfigureChildPinSchema>;
export type UnlockChildInput = z.infer<typeof UnlockChildSchema>;
```

- [ ] **Step 4: Run validation tests and verify green**

Run:

```powershell
pnpm --filter @fovari/validation test
pnpm --filter @fovari/validation typecheck
```

Expected: all validation tests and typecheck pass.

- [ ] **Step 5: Write the failing repository-contract test**

Append to `packages/api-client/src/contracts.test.ts`:

```ts
import type { FamilySnapshot } from "./family-repository";

it("models one explicit signed-out, adult, or child session", () => {
  const sessions: FamilySnapshot["session"][] = [
    { kind: "signed_out" },
    { actorId: "adult-1", kind: "adult" },
    { actorId: "child-1", childId: "child-1", kind: "child" },
  ];

  expect(sessions.map((session) => session.kind)).toEqual(["signed_out", "adult", "child"]);
});
```

- [ ] **Step 6: Run API client tests and verify red**

Run:

```powershell
pnpm --filter @fovari/api-client test -- src/contracts.test.ts
```

Expected: TypeScript compilation FAIL because `FamilySnapshot["session"]` does not exist.

- [ ] **Step 7: Add the setup and session types**

Add to `packages/api-client/src/family-repository.ts`:

```ts
import type {
  ExperienceMode,
  FamilyActor,
  OnboardingState,
  PointTransaction,
} from "@fovari/domain";
import type {
  ConfigureChildPinInput,
  NotificationPreferencesInput,
  OnboardingChildDraftInput,
  UnlockChildInput,
} from "@fovari/validation";

export type FamilySession =
  | { kind: "signed_out" }
  | { actorId: string; kind: "adult" }
  | { actorId: string; childId: string; kind: "child" };

export interface LocalAdultSummary {
  displayName: string;
  id: string;
}

export interface NotificationPreferences extends NotificationPreferencesInput {}

export interface OnboardingDraft {
  adultDisplayName: string;
  childDrafts: readonly OnboardingChildDraftInput[];
  familyName: string;
  notificationPreferences: NotificationPreferences;
  pointsName: string;
  selectedStarterGoalIds: readonly string[];
  selectedStarterRewardIds: readonly string[];
  timezone: string;
}

export interface BeginFamilySetupInput {
  adultDisplayName: string;
}

export interface SaveOnboardingDraftInput {
  draft: OnboardingDraft;
  onboarding: OnboardingState;
}

export interface CompleteFamilySetupInput {
  childPins: Readonly<Record<string, string>>;
  draft: OnboardingDraft;
}
```

Extend `ChildSummary`:

```ts
pinConfigured: boolean;
```

Extend `FamilySnapshot`:

```ts
adult: LocalAdultSummary;
notificationPreferences: NotificationPreferences;
onboarding: OnboardingState;
onboardingDraft: OnboardingDraft | null;
pointsName: string;
session: FamilySession;
timezone: string;
```

Export every new public type from `packages/api-client/src/index.ts`.

- [ ] **Step 8: Update synthetic fixtures with explicit setup/session state**

Add to `createDemoSeed()`:

```ts
adult: { displayName: "Jamie", id: DEMO_IDS.parent },
notificationPreferences: {
  approvalUpdates: true,
  childEncouragement: true,
  enabled: true,
  quietHoursEnd: "07:00",
  quietHoursStart: "20:30",
  weeklySummary: true,
},
onboarding: {
  completedSteps: [
    "adult",
    "family",
    "children",
    "starter_goals",
    "starter_rewards",
    "notifications",
    "review",
  ],
  currentStep: "complete",
  status: "complete",
},
onboardingDraft: null,
pointsName: "Stars",
session: { actorId: DEMO_IDS.parent, kind: "adult" },
timezone: "America/New_York",
```

Add `pinConfigured: false` to both synthetic child summaries.

- [ ] **Step 9: Run contract, mobile type, and fixture tests**

Run:

```powershell
pnpm --filter @fovari/api-client test
pnpm --filter @fovari/api-client typecheck
pnpm --filter @fovari/mobile typecheck
```

Expected: API contract tests, API typecheck, and mobile typecheck pass. Repository commands are
added together with their implementations in Task 4 so this task does not leave a broken interface.

- [ ] **Step 10: Commit the green setup state contracts**

```powershell
git add packages/validation packages/api-client apps/mobile/src/data/fixtures.ts
git commit -m "feat: define family setup contracts"
```

---

### Task 3: Versioned local storage and credential vault

**Files:**

- Create: `apps/mobile/src/data/local-storage.ts`
- Create: `apps/mobile/src/data/local-storage.test.ts`
- Create: `apps/mobile/src/data/child-pin-vault.ts`
- Create: `apps/mobile/src/data/child-pin-vault.test.ts`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `FamilySnapshot` and `OfflineAction`.
- Produces:
  - `KeyValueStorage`
  - `LocalFamilyEnvelopeV1`
  - `readLocalEnvelope(storage, seed)`
  - `writeLocalEnvelope(storage, envelope)`
  - `ChildPinVault`
  - `createChildPinVault(storage, digest, randomId)`.

- [ ] **Step 1: Write failing envelope tests**

```ts
import { describe, expect, it } from "vitest";

import { createDemoSeed } from "./fixtures";
import { createMemoryStorage, readLocalEnvelope, writeLocalEnvelope } from "./local-storage";

describe("versioned local family storage", () => {
  it("uses the supplied seed once and restores a written envelope", async () => {
    const storage = createMemoryStorage();
    const seed = createDemoSeed();
    const initial = await readLocalEnvelope(storage, seed);

    expect(initial.version).toBe(1);
    expect(initial.snapshot.familyName).toBe("The Rivera Family");

    const changed = {
      ...initial,
      snapshot: { ...initial.snapshot, familyName: "The Park Family" },
    };
    await writeLocalEnvelope(storage, changed);

    expect((await readLocalEnvelope(storage, seed)).snapshot.familyName).toBe("The Park Family");
  });

  it("rejects unsupported data without silently changing permissions", async () => {
    const storage = createMemoryStorage({
      "fovari.local-family": JSON.stringify({ version: 99 }),
    });

    await expect(readLocalEnvelope(storage, createDemoSeed())).rejects.toThrow(
      "Unsupported local family data",
    );
  });
});
```

- [ ] **Step 2: Run the storage test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/local-storage.test.ts
```

Expected: FAIL because `./local-storage` does not exist.

- [ ] **Step 3: Implement the versioned storage port**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { FamilySnapshot } from "@fovari/api-client";

import type { OfflineAction } from "./offline-queue";

const STORAGE_KEY = "fovari.local-family";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LocalFamilyEnvelopeV1 {
  nextSequence: number;
  offlineActions: readonly OfflineAction[];
  pinAttempts: Readonly<Record<string, { failures: number; lockedUntil?: number }>>;
  processedCommandIds: readonly string[];
  snapshot: FamilySnapshot;
  version: 1;
}

export const asyncStorage: KeyValueStorage = AsyncStorage;

export function createMemoryStorage(
  initial: Readonly<Record<string, string>> = {},
): KeyValueStorage {
  const values = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

export async function readLocalEnvelope(
  storage: KeyValueStorage,
  seed: FamilySnapshot,
): Promise<LocalFamilyEnvelopeV1> {
  const serialized = await storage.getItem(STORAGE_KEY);
  if (!serialized) {
    return {
      nextSequence: 1,
      offlineActions: [],
      pinAttempts: {},
      processedCommandIds: seed.ledger.map((entry) => entry.idempotencyKey),
      snapshot: structuredClone(seed),
      version: 1,
    };
  }

  const parsed = JSON.parse(serialized) as { version?: unknown };
  if (parsed.version !== 1) {
    throw new Error("Unsupported local family data. Reset the synthetic family to continue.");
  }
  return structuredClone(parsed as LocalFamilyEnvelopeV1);
}

export async function writeLocalEnvelope(
  storage: KeyValueStorage,
  envelope: LocalFamilyEnvelopeV1,
): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}
```

- [ ] **Step 4: Run the storage tests and verify green**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/local-storage.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Install the SDK-compatible Expo Crypto package**

Run:

```powershell
pnpm --filter @fovari/mobile exec expo install expo-crypto
```

Expected: `expo-crypto` is added at the Expo SDK 57-compatible version and the lockfile remains
installable with `pnpm install --frozen-lockfile`.

- [ ] **Step 6: Write failing PIN-vault tests**

```ts
import { describe, expect, it } from "vitest";

import { createChildPinVault } from "./child-pin-vault";
import { createMemoryStorage } from "./local-storage";

describe("child PIN vault", () => {
  it("stores only a salted digest and verifies the matching PIN", async () => {
    const storage = createMemoryStorage();
    const vault = createChildPinVault({
      digest: async (value) => `digest:${value}`,
      randomId: () => "salt-1",
      storage,
    });

    await vault.set("child-1", "2468");

    expect(await vault.verify("child-1", "2468")).toBe(true);
    expect(await vault.verify("child-1", "1111")).toBe(false);
    expect(await storage.getItem("fovari.child-pin.child-1")).not.toContain("2468");
  });

  it("reports an unconfigured profile and supports removal", async () => {
    const vault = createChildPinVault({
      digest: async (value) => `digest:${value}`,
      randomId: () => "salt-2",
      storage: createMemoryStorage(),
    });

    expect(await vault.isConfigured("child-2")).toBe(false);
    await vault.set("child-2", "1357");
    await vault.remove("child-2");
    expect(await vault.isConfigured("child-2")).toBe(false);
  });
});
```

- [ ] **Step 7: Run the PIN-vault tests and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/child-pin-vault.test.ts
```

Expected: FAIL because `./child-pin-vault` does not exist.

- [ ] **Step 8: Implement the injected PIN vault**

```ts
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { asyncStorage, type KeyValueStorage } from "./local-storage";

interface StoredPin {
  digest: string;
  salt: string;
}

export interface ChildPinVault {
  isConfigured(childId: string): Promise<boolean>;
  remove(childId: string): Promise<void>;
  set(childId: string, pin: string): Promise<void>;
  verify(childId: string, pin: string): Promise<boolean>;
}

interface ChildPinVaultOptions {
  digest(value: string): Promise<string>;
  randomId(): string;
  storage: KeyValueStorage;
}

const keyFor = (childId: string) => `fovari.child-pin.${childId}`;

export function createChildPinVault(options: ChildPinVaultOptions): ChildPinVault {
  return {
    async isConfigured(childId) {
      return (await options.storage.getItem(keyFor(childId))) !== null;
    },
    async remove(childId) {
      await options.storage.removeItem(keyFor(childId));
    },
    async set(childId, pin) {
      const salt = options.randomId();
      const digest = await options.digest(`${salt}:${pin}`);
      await options.storage.setItem(keyFor(childId), JSON.stringify({ digest, salt }));
    },
    async verify(childId, pin) {
      const serialized = await options.storage.getItem(keyFor(childId));
      if (!serialized) return false;
      const stored = JSON.parse(serialized) as StoredPin;
      return (await options.digest(`${stored.salt}:${pin}`)) === stored.digest;
    },
  };
}

export const expoDigest = (value: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);

export const expoRandomId = () =>
  Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");

const secureStoreStorage: KeyValueStorage = {
  getItem: SecureStore.getItemAsync,
  removeItem: SecureStore.deleteItemAsync,
  setItem: SecureStore.setItemAsync,
};

export const childPinStorage = Platform.OS === "web" ? asyncStorage : secureStoreStorage;
```

Use `expo-crypto` only to avoid storing the raw synthetic PIN. The implementation and UI must state
that a production child credential requires a reviewed server/native credential design. Native
devices use SecureStore; the web preview uses the documented AsyncStorage fallback only for
synthetic data.

- [ ] **Step 9: Run focused storage, PIN, install, and type gates**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/local-storage.test.ts src/data/child-pin-vault.test.ts
pnpm --filter @fovari/mobile typecheck
pnpm install --frozen-lockfile
```

Expected: 4 focused tests pass, mobile typecheck passes, and the lockfile is valid.

- [ ] **Step 10: Commit the green storage and credential adapters**

```powershell
git add apps/mobile/package.json apps/mobile/src/data/child-pin-vault.ts apps/mobile/src/data/child-pin-vault.test.ts apps/mobile/src/data/local-storage.ts apps/mobile/src/data/local-storage.test.ts pnpm-lock.yaml
git commit -m "feat: persist synthetic family credentials"
```

---

### Task 4: Persisted setup and session repository transactions

**Files:**

- Modify: `apps/mobile/src/data/local-family-repository.ts`
- Modify: `apps/mobile/src/data/local-family-repository.test.ts`
- Modify: `apps/mobile/src/data/fixtures.ts`
- Create: `apps/mobile/src/data/starter-content.ts`
- Modify: `apps/mobile/src/providers/AppProviders.tsx`
- Modify: `packages/api-client/src/family-repository.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/validation/src/index.ts`
- Modify: `packages/validation/src/index.test.ts`
- Test: `apps/mobile/src/data/local-storage.test.ts`
- Test: `apps/mobile/src/data/child-pin-vault.test.ts`

**Interfaces:**

- Consumes: `LocalFamilyEnvelopeV1`, `KeyValueStorage`, `ChildPinVault`, `completeOnboardingStep`,
  and `attemptChildUnlock`.
- Produces:

```ts
interface LocalFamilyRepositoryOptions {
  now?: () => number;
  pinVault: ChildPinVault;
  seed: FamilySnapshot;
  storage: KeyValueStorage;
}

function createLocalFamilyRepository(options: LocalFamilyRepositoryOptions): FamilyRepository;
```

- [ ] **Step 1: Write the failing persisted setup transaction test**

Append to `apps/mobile/src/data/local-family-repository.test.ts`:

```ts
it("persists a completed family setup and restores the adult session", async () => {
  const storage = createMemoryStorage();
  const pinVault = createChildPinVault({
    digest: async (value) => `digest:${value}`,
    randomId: () => "salt",
    storage,
  });
  const repository = createLocalFamilyRepository({
    pinVault,
    seed: createDemoSeed(),
    storage,
  });

  await repository.beginFamilySetup(
    { adultDisplayName: "Morgan" },
    createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "begin-setup",
    }),
  );

  const draft = {
    adultDisplayName: "Morgan",
    childDrafts: [
      {
        clientId: "draft-maya",
        displayName: "Maya",
        experienceMode: "explorer" as const,
        pinRequested: true,
      },
    ],
    familyName: "The Park Family",
    notificationPreferences: {
      approvalUpdates: true,
      childEncouragement: true,
      enabled: true,
      quietHoursEnd: "07:00",
      quietHoursStart: "20:30",
      weeklySummary: true,
    },
    pointsName: "Stars",
    selectedStarterGoalIds: ["starter-reading"],
    selectedStarterRewardIds: ["starter-movie"],
    timezone: "America/New_York",
  };

  const saved = await repository.saveOnboardingDraft(
    {
      draft,
      onboarding: {
        completedSteps: ["adult", "family", "children"],
        currentStep: "starter_goals",
        status: "in_progress",
      },
    },
    createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "save-setup",
    }),
  );
  expect(saved.onboarding.currentStep).toBe("starter_goals");

  const completed = await repository.completeFamilySetup(
    { childPins: { "draft-maya": "2468" }, draft },
    createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "complete-setup",
    }),
  );

  expect(completed.familyName).toBe("The Park Family");
  expect(completed.children).toEqual([
    expect.objectContaining({ name: "Maya", pinConfigured: true }),
  ]);
  expect(completed.goals).toHaveLength(1);
  expect(completed.rewards).toHaveLength(1);
  expect(completed.onboarding.status).toBe("complete");

  const restored = createLocalFamilyRepository({
    pinVault,
    seed: createDemoSeed(),
    storage,
  });
  expect((await restored.getSnapshot()).familyName).toBe("The Park Family");
});
```

- [ ] **Step 2: Run the persisted setup test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/local-family-repository.test.ts
```

Expected: FAIL because the repository does not accept the options object or implement setup
commands.

- [ ] **Step 3: Add lazy hydration and atomic persistence**

First extend `FamilyRepository` in `packages/api-client/src/family-repository.ts`:

```ts
beginFamilySetup(input: BeginFamilySetupInput, context: CommandContext): Promise<FamilySnapshot>;
completeFamilySetup(
  input: CompleteFamilySetupInput,
  context: CommandContext,
): Promise<FamilySnapshot>;
configureChildPin(input: ConfigureChildPinInput, context: CommandContext): Promise<FamilySnapshot>;
resetDemo(context: CommandContext): Promise<FamilySnapshot>;
saveOnboardingDraft(
  input: SaveOnboardingDraftInput,
  context: CommandContext,
): Promise<FamilySnapshot>;
signInAdult(): Promise<FamilySnapshot>;
signOut(): Promise<FamilySnapshot>;
unlockChild(input: UnlockChildInput): Promise<FamilySnapshot>;
```

Refactor repository construction around this exact state:

```ts
export function createLocalFamilyRepository(
  options: LocalFamilyRepositoryOptions,
): FamilyRepository {
  let envelope: LocalFamilyEnvelopeV1 | null = null;
  let hydration: Promise<void> | null = null;

  const ensureHydrated = async () => {
    hydration ??= readLocalEnvelope(options.storage, options.seed).then((loaded) => {
      envelope = loaded;
    });
    await hydration;
  };

  const current = () => {
    if (!envelope) throw new Error("Local family repository is not hydrated");
    return envelope;
  };

  const persist = async () => {
    await writeLocalEnvelope(options.storage, current());
  };

  const snapshotResult = () => structuredClone(current().snapshot);

  const nextId = () => {
    const value = current().nextSequence;
    current().nextSequence += 1;
    return `90000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
  };

  const rejectDuplicate = (idempotencyKey: string) => {
    if (current().processedCommandIds.includes(idempotencyKey)) {
      throw new Error("This command was already processed");
    }
  };

  const markProcessed = (idempotencyKey: string) => {
    current().processedCommandIds = [
      ...current().processedCommandIds,
      idempotencyKey,
    ];
  };
```

Every existing public method must start with `await ensureHydrated()`. Replace the closure-level
`snapshot` and `processedCommands` with `current().snapshot` and
`new Set(current().processedCommandIds)`. After each successful mutation, set the updated immutable
snapshot, add the command key once, call `await persist()`, and return `snapshotResult()`.

Replace `actorFor` with an active-session check before evaluating permissions:

```ts
const actorFor = (actorId: string): FamilyActor => {
  const session = current().snapshot.session;
  if (session.kind === "signed_out" || session.actorId !== actorId) {
    throw new Error("Actor does not match the active local session");
  }
  if (current().snapshot.activeActor.id !== actorId) {
    throw new Error("Active actor and session are inconsistent");
  }
  return current().snapshot.activeActor;
};
```

Replace direct test construction with:

```ts
const createTestRepository = () => {
  const storage = createMemoryStorage();
  const pinVault = createChildPinVault({
    digest: async (value) => `digest:${value}`,
    randomId: () => "test-salt",
    storage,
  });
  return {
    pinVault,
    repository: createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    }),
    storage,
  };
};
```

- [ ] **Step 4: Implement begin and draft-save transactions**

Use:

```ts
async beginFamilySetup(input, context) {
  await ensureHydrated();
  requireAdultPermission(context, "manage_privacy");
  rejectDuplicate(context.idempotencyKey);
  const adultDisplayName = input.adultDisplayName.trim();
  if (!adultDisplayName) throw new Error("Adult display name is required");

  current().snapshot = {
    ...createBlankFamilySeed(current().snapshot),
    adult: { displayName: adultDisplayName, id: context.actorId },
    activeActor: { id: context.actorId, role: "family_owner" },
    onboarding: createOnboardingState(),
    session: { actorId: context.actorId, kind: "adult" },
  };
  markProcessed(context.idempotencyKey);
  await persist();
  return snapshotResult();
},

async saveOnboardingDraft(input, context) {
  await ensureHydrated();
  requireAdultPermission(context, "manage_privacy");
  rejectDuplicate(context.idempotencyKey);
  current().snapshot = {
    ...current().snapshot,
    onboarding: structuredClone(input.onboarding),
    onboardingDraft: structuredClone(input.draft),
  };
  markProcessed(context.idempotencyKey);
  await persist();
  return snapshotResult();
},
```

`createBlankFamilySeed(existing)` must retain only the synthetic family/adult identifiers and return
empty child-owned data:

```ts
const createBlankFamilySeed = (existing: FamilySnapshot): FamilySnapshot => ({
  achievements: [],
  activeActor: { id: existing.adult.id, role: "family_owner" },
  activeChildId: "",
  adult: structuredClone(existing.adult),
  calendar: [],
  children: [],
  completions: [],
  familyId: existing.familyId,
  familyName: "",
  goals: [],
  ledger: [],
  notificationPreferences: {
    approvalUpdates: true,
    childEncouragement: true,
    enabled: false,
    quietHoursEnd: "07:00",
    quietHoursStart: "20:00",
    weeklySummary: true,
  },
  onboarding: createOnboardingState(),
  onboardingDraft: null,
  pointsName: "Stars",
  redemptions: [],
  rewards: [],
  selectedRewardByChild: {},
  session: { actorId: existing.adult.id, kind: "adult" },
  timezone: "America/New_York",
});
```

- [ ] **Step 5: Implement the atomic completion transaction**

Create `apps/mobile/src/data/starter-content.ts`:

```ts
export const STARTER_GOALS = [
  {
    category: "reading",
    emoji: "📚",
    id: "starter-reading",
    instructions: "Read together for 15 minutes.",
    pointValue: 10,
    title: "Read together",
  },
  {
    category: "chores",
    emoji: "🧸",
    id: "starter-tidy",
    instructions: "Put your things back in their homes.",
    pointValue: 5,
    title: "Tidy up",
  },
] as const;

export const STARTER_REWARDS = [
  {
    emoji: "🍿",
    id: "starter-movie",
    pointCost: 100,
    title: "Family movie night",
    type: "experience" as const,
  },
  {
    emoji: "🎮",
    id: "starter-game-time",
    pointCost: 50,
    title: "30 minutes game time",
    type: "privilege" as const,
  },
] as const;
```

`completeFamilySetup` must:

1. Parse every child draft and notification preference through Zod.
2. Reject zero children.
3. Create stable child IDs before goals/rewards.
4. Store requested PIN digests through `pinVault.set`.
5. Create only the selected starter goals/rewards from checked-in fixture definitions.
6. Set every onboarding step complete.
7. Persist exactly once after all validations and vault writes succeed.
8. Keep the adult session active.

Build children and starter content deterministically:

```ts
const children: ChildSummary[] = input.draft.childDrafts.map((draft) => ({
  avatarKey: draft.experienceMode,
  completedToday: 0,
  experienceMode: draft.experienceMode,
  id: nextId(),
  level: 1,
  name: draft.displayName.trim(),
  pinConfigured: Boolean(input.childPins[draft.clientId]),
  points: 0,
  streakDays: 0,
  totalToday: input.draft.selectedStarterGoalIds.length,
}));

const selectedGoalDefinitions = STARTER_GOALS.filter((goal) =>
  input.draft.selectedStarterGoalIds.includes(goal.id),
);
const goals: GoalSummary[] = children.flatMap((child) =>
  selectedGoalDefinitions.map((goal) => ({
    category: goal.category,
    childId: child.id,
    dueLabel: "Daily",
    id: nextId(),
    instructions: goal.instructions,
    pointValue: goal.pointValue,
    status: "ready",
    title: goal.title,
    verification: "parent",
  })),
);

const rewards: RewardSummary[] = STARTER_REWARDS.filter((reward) =>
  input.draft.selectedStarterRewardIds.includes(reward.id),
).map((reward) => ({
  accent: "#E9E5FF",
  emoji: reward.emoji,
  id: nextId(),
  pointCost: reward.pointCost,
  title: reward.title,
  type: reward.type,
}));

const selectedRewardByChild =
  rewards[0] === undefined
    ? {}
    : Object.fromEntries(children.map((child) => [child.id, rewards[0]!.id]));
```

Write PIN credentials with rollback before assigning the snapshot:

```ts
const childIdToClientId = Object.fromEntries(
  children.map((child, index) => [child.id, input.draft.childDrafts[index]!.clientId]),
);
const configuredChildIds: string[] = [];
try {
  for (const child of children) {
    const clientId = childIdToClientId[child.id];
    const pin = clientId ? input.childPins[clientId] : undefined;
    if (!pin) continue;
    await options.pinVault.set(child.id, pin);
    configuredChildIds.push(child.id);
  }
} catch (cause) {
  await Promise.all(configuredChildIds.map((childId) => options.pinVault.remove(childId)));
  throw cause;
}
```

Use this state assignment after validation:

```ts
current().snapshot = {
  ...current().snapshot,
  achievements: [],
  adult: {
    displayName: input.draft.adultDisplayName.trim(),
    id: context.actorId,
  },
  activeActor: { id: context.actorId, role: "family_owner" },
  activeChildId: children[0]!.id,
  children,
  familyName: input.draft.familyName.trim(),
  goals,
  notificationPreferences: structuredClone(input.draft.notificationPreferences),
  onboarding: {
    completedSteps: [
      "adult",
      "family",
      "children",
      "starter_goals",
      "starter_rewards",
      "notifications",
      "review",
    ],
    currentStep: "complete",
    status: "complete",
  },
  onboardingDraft: null,
  pointsName: input.draft.pointsName.trim(),
  rewards,
  selectedRewardByChild,
  session: { actorId: context.actorId, kind: "adult" },
  timezone: input.draft.timezone,
};
```

- [ ] **Step 6: Write the failing session and PIN tests**

Append:

```ts
const createCompletedFamilyWithPin = async (pin: string) => {
  const harness = createTestRepository();
  await harness.repository.configureChildPin(
    { childId: DEMO_IDS.alex, pin },
    createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "configure-alex-pin",
    }),
  );
  return harness;
};

it("does not enter a PIN-protected child session until the PIN matches", async () => {
  const { repository } = await createCompletedFamilyWithPin("2468");
  const child = (await repository.getSnapshot()).children[0]!;

  await expect(
    repository.unlockChild({ childId: child.id, now: 1_000, pin: "1111" }),
  ).rejects.toThrow("2 tries left");

  const unlocked = await repository.unlockChild({
    childId: child.id,
    now: 2_000,
    pin: "2468",
  });
  expect(unlocked.session).toEqual({
    actorId: child.id,
    childId: child.id,
    kind: "child",
  });
  expect(unlocked.activeActor).toEqual({
    childId: child.id,
    id: child.id,
    role: "child",
  });

  const signedOut = await repository.signOut();
  expect(signedOut.session).toEqual({ kind: "signed_out" });

  const adult = await repository.signInAdult();
  expect(adult.session.kind).toBe("adult");
});
```

- [ ] **Step 7: Run session tests and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/data/local-family-repository.test.ts
```

Expected: the new session test FAILS because unlock/sign-in/sign-out are unimplemented.

- [ ] **Step 8: Implement session, PIN, and reset commands**

`configureChildPin` requires `manage_privacy`, validates the PIN, writes the digest, updates only
`pinConfigured`, persists, and records the idempotency key.

`unlockChild` must:

```ts
const child = current().snapshot.children.find((item) => item.id === input.childId);
if (!child) throw new Error("Child profile was not found");
const prior = current().pinAttempts[child.id] ?? { failures: 0 };
const matches = child.pinConfigured
  ? await options.pinVault.verify(child.id, input.pin ?? "")
  : true;
const decision = attemptChildUnlock({
  configured: child.pinConfigured,
  failures: prior.failures,
  ...(prior.lockedUntil === undefined ? {} : { lockedUntil: prior.lockedUntil }),
  matches,
  now: input.now,
});
current().pinAttempts = {
  ...current().pinAttempts,
  [child.id]: {
    failures: decision.failures,
    ...(!decision.ok && decision.lockedUntil !== undefined
      ? { lockedUntil: decision.lockedUntil }
      : {}),
  },
};
if (!decision.ok) {
  await persist();
  if (decision.lockedUntil !== undefined) {
    throw new Error(`Profile locked until ${new Date(decision.lockedUntil).toISOString()}`);
  }
  throw new Error(`That PIN does not match. ${decision.remainingAttempts} tries left.`);
}
current().snapshot = {
  ...current().snapshot,
  activeActor: { childId: child.id, id: child.id, role: "child" },
  activeChildId: child.id,
  session: { actorId: child.id, childId: child.id, kind: "child" },
};
await persist();
return snapshotResult();
```

`signOut` sets `session: { kind: "signed_out" }` and persists. `signInAdult` restores the configured
adult actor and session. `resetDemo` requires the adult privacy permission, removes every configured
child PIN, replaces the envelope with the exact `createDemoSeed()` snapshot, persists, and returns
the seed. Reset the non-snapshot envelope state explicitly:

```ts
current().nextSequence = 1;
current().offlineActions = [];
current().pinAttempts = {};
current().processedCommandIds = createDemoSeed().ledger.map((entry) => entry.idempotencyKey);
current().snapshot = createDemoSeed();
await persist();
return snapshotResult();
```

- [ ] **Step 9: Wire the persisted repository into application services**

In `AppProviders.tsx`, replace the seed-only repository construction with:

```ts
const storage = asyncStorage;
const pinVault = createChildPinVault({
  digest: expoDigest,
  randomId: expoRandomId,
  storage: childPinStorage,
});
const repository = createLocalFamilyRepository({
  pinVault,
  seed: createDemoSeed(),
  storage,
});
```

Keep the existing `useRef` lifetime so renders do not recreate or rehydrate a second repository.

- [ ] **Step 10: Run the complete focused repository and contract gates**

Run:

```powershell
pnpm --filter @fovari/validation test
pnpm --filter @fovari/domain test
pnpm --filter @fovari/api-client test
pnpm --filter @fovari/mobile test -- src/data/local-family-repository.test.ts src/data/local-storage.test.ts src/data/child-pin-vault.test.ts
pnpm --filter @fovari/mobile typecheck
```

Expected: all focused tests and typechecks pass.

- [ ] **Step 11: Commit contracts, persistence, and repository behavior**

```powershell
git add packages/api-client apps/mobile/src/data apps/mobile/src/providers/AppProviders.tsx
git commit -m "feat: persist local family identity"
```

---

### Task 5: Session-aware application services and route guards

**Files:**

- Modify: `apps/mobile/src/hooks/use-family.ts`
- Create: `apps/mobile/src/components/RouteGuard.tsx`
- Create: `apps/mobile/src/components/RouteGuard.test.tsx`
- Modify: `apps/mobile/app/(parent)/_layout.tsx`
- Modify: `apps/mobile/app/(child)/(tabs)/_layout.tsx`
- Modify: `apps/mobile/app/(child)/goal/[occurrenceId].tsx`
- Modify: `apps/mobile/app/(child)/victory-vault.tsx`

**Interfaces:**

- Consumes: the persisted repository factory and `FamilySession`.
- Produces:
  - `useFamilySession()`
  - `useOnboardingState()`
  - `<RouteGuard allow="adult" | "child">`.

- [ ] **Step 1: Write failing route-guard render tests**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "react-native";

import { RouteGuard } from "./RouteGuard";

describe("RouteGuard", () => {
  it("renders adult content only for an adult session", () => {
    render(
      <RouteGuard
        allow="adult"
        onRecover={() => undefined}
        session={{ actorId: "adult-1", kind: "adult" }}
      >
        <Text>Private adult content</Text>
      </RouteGuard>,
    );
    expect(screen.getByText("Private adult content")).toBeInTheDocument();
  });

  it("renders a non-privileged recovery action for a child session", () => {
    render(
      <RouteGuard
        allow="adult"
        onRecover={() => undefined}
        session={{ actorId: "child-1", childId: "child-1", kind: "child" }}
      >
        <Text>Private adult content</Text>
      </RouteGuard>,
    );
    expect(screen.queryByText("Private adult content")).not.toBeInTheDocument();
    expect(screen.getByText("Grown-up access required")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the guard test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/components/RouteGuard.test.tsx
```

Expected: FAIL because `RouteGuard` does not exist.

- [ ] **Step 3: Implement the explicit route guard**

```tsx
import type { PropsWithChildren } from "react";
import { StyleSheet, Text } from "react-native";

import type { FamilySession } from "@fovari/api-client";
import { colors, spacing } from "@fovari/design-system";

import { Button } from "./Button";
import { Card } from "./Card";
import { LoadingState } from "./LoadingState";

interface RouteGuardProps {
  allow: "adult" | "child";
  onRecover(): void;
  session: FamilySession | null;
}

export function RouteGuard({
  allow,
  children,
  onRecover,
  session,
}: PropsWithChildren<RouteGuardProps>) {
  if (!session) return <LoadingState />;

  const allowed =
    (allow === "adult" && session.kind === "adult") ||
    (allow === "child" && session.kind === "child");
  if (allowed) return <>{children}</>;

  return (
    <Card>
      <Text style={styles.title}>
        {allow === "adult" ? "Grown-up access required" : "Choose a child profile"}
      </Text>
      <Text style={styles.copy}>
        This area is protected. Return to the profile screen to continue safely.
      </Text>
      <Button onPress={onRecover}>Return safely</Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
});
```

- [ ] **Step 4: Guard parent and child layouts**

Add `useFamilySession()`:

```ts
export function useFamilySession(): FamilySnapshot["session"] | null {
  return useFamilyStore((state) => state.snapshot?.session ?? null);
}
```

Wrap the parent stack:

```tsx
const session = useFamilySession();
const router = useRouter();
return (
  <RouteGuard
    allow="adult"
    onRecover={() => router.replace("/(child)/parent-gate")}
    session={session}
  >
    <Stack screenOptions={{ headerShown: false, presentation: "card" }} />
  </RouteGuard>
);
```

Keep `apps/mobile/app/(child)/_layout.tsx` unguarded so profile selection, PIN unlock, and the
parent gate remain reachable from a signed-out session. Use `allow="child"` and
`onRecover={() => router.replace("/(child)/select-profile")}` around the child tabs, goal detail,
and Victory Vault content.

- [ ] **Step 5: Run guard, rendered, type, and lint tests**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/components/RouteGuard.test.tsx src/components/AppShell.test.tsx
pnpm --filter @fovari/mobile typecheck
pnpm --filter @fovari/mobile lint
```

Expected: route-guard and shell tests, typecheck, and lint pass.

- [ ] **Step 6: Commit session-aware services**

```powershell
git add apps/mobile/src apps/mobile/app/\(parent\)/_layout.tsx apps/mobile/app/\(child\)/\(tabs\)/_layout.tsx apps/mobile/app/\(child\)/goal apps/mobile/app/\(child\)/victory-vault.tsx
git commit -m "feat: guard persisted family sessions"
```

---

### Task 6: Resumable family onboarding wizard

**Files:**

- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/app/onboarding.tsx`
- Create: `apps/mobile/src/features/onboarding/OnboardingWizard.tsx`
- Create: `apps/mobile/src/features/onboarding/OnboardingWizard.test.tsx`
- Create: `apps/mobile/src/features/onboarding/OnboardingProgress.tsx`
- Create: `apps/mobile/src/features/onboarding/ExperienceModePicker.tsx`
- Modify: `apps/mobile/src/data/starter-content.ts`
- Modify: `apps/mobile/src/components/WelcomeScreen.tsx`
- Modify: `apps/mobile/src/components/AppShell.test.tsx`

**Interfaces:**

- Consumes: `OnboardingDraft`, setup repository commands, experience-mode tokens, and starter
  content IDs.
- Produces: a seven-step wizard that saves after each step and atomically completes setup.

- [ ] **Step 1: Write the failing rendered onboarding journey**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { OnboardingWizard } from "./OnboardingWizard";

describe("OnboardingWizard", () => {
  it("creates a family, child, starter goal, reward, and preferences", async () => {
    const completeFamilySetup = vi.fn().mockResolvedValue({
      ...createDemoSeed(),
      familyName: "The Park Family",
    });
    const saveOnboardingDraft = vi.fn().mockResolvedValue(createDemoSeed());

    render(
      <OnboardingWizard
        busy={false}
        completeFamilySetup={completeFamilySetup}
        error={null}
        initialDraft={null}
        saveOnboardingDraft={saveOnboardingDraft}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your display name"), {
      target: { value: "Morgan" },
    });
    fireEvent.click(screen.getByText("Continue"));

    fireEvent.change(screen.getByLabelText("Family name"), {
      target: { value: "The Park Family" },
    });
    fireEvent.click(screen.getByText("Continue"));

    fireEvent.change(screen.getByLabelText("Child name"), {
      target: { value: "Maya" },
    });
    fireEvent.click(screen.getByLabelText("Explorer ages 4 to 7"));
    fireEvent.click(screen.getByText("Add child"));
    fireEvent.click(screen.getByText("Continue"));

    fireEvent.click(screen.getByLabelText("Select starter goal Read together"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByLabelText("Select starter reward Family movie night"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Create my family"));

    await waitFor(() => expect(completeFamilySetup).toHaveBeenCalledTimes(1));
    expect(completeFamilySetup).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.objectContaining({
          adultDisplayName: "Morgan",
          familyName: "The Park Family",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the onboarding render test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/onboarding/OnboardingWizard.test.tsx
```

Expected: FAIL because `OnboardingWizard` does not exist.

- [ ] **Step 3: Render deterministic starter content**

Import the dependency-neutral definitions created in Task 4:

```tsx
import { STARTER_GOALS, STARTER_REWARDS } from "../../data/starter-content";

const StarterGoalOptions = ({
  selectedIds,
  toggle,
}: {
  selectedIds: readonly string[];
  toggle(id: string): void;
}) => (
  <>
    {STARTER_GOALS.map((goal) => (
      <Pressable
        accessibilityLabel={`Select starter goal ${goal.title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selectedIds.includes(goal.id) }}
        key={goal.id}
        onPress={() => toggle(goal.id)}
      >
        <Text>{goal.emoji}</Text>
        <Text>{goal.title}</Text>
        <Text>{goal.pointValue} Stars</Text>
      </Pressable>
    ))}
  </>
);

const StarterRewardOptions = ({
  selectedIds,
  toggle,
}: {
  selectedIds: readonly string[];
  toggle(id: string): void;
}) => (
  <>
    {STARTER_REWARDS.map((reward) => (
      <Pressable
        accessibilityLabel={`Select starter reward ${reward.title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selectedIds.includes(reward.id) }}
        key={reward.id}
        onPress={() => toggle(reward.id)}
      >
        <Text>{reward.emoji}</Text>
        <Text>{reward.title}</Text>
        <Text>{reward.pointCost} Stars</Text>
      </Pressable>
    ))}
  </>
);
```

- [ ] **Step 4: Implement one validated step at a time**

`OnboardingWizard` owns:

```ts
export const createDefaultOnboardingDraft = (): OnboardingDraft => ({
  adultDisplayName: "",
  childDrafts: [],
  familyName: "",
  notificationPreferences: {
    approvalUpdates: true,
    childEncouragement: true,
    enabled: false,
    quietHoursEnd: "07:00",
    quietHoursStart: "20:00",
    weeklySummary: true,
  },
  pointsName: "Stars",
  selectedStarterGoalIds: [],
  selectedStarterRewardIds: [],
  timezone: "America/New_York",
});

const [step, setStep] = useState<Exclude<OnboardingStep, "complete">>("adult");
const [onboarding, setOnboarding] = useState(createOnboardingState());
const [draft, setDraft] = useState<OnboardingDraft>(initialDraft ?? createDefaultOnboardingDraft());
const [childPins, setChildPins] = useState<Record<string, string>>({});
```

Each Continue action:

1. Validates only the current step.
2. Calls `completeOnboardingStep`.
3. Calls `saveOnboardingDraft({ draft, onboarding: next.value })`.
4. Moves to `next.value.currentStep`.
5. Keeps all input when save fails.

The children step supports multiple draft cards, removal before completion, four experience modes,
and an optional 4–6 digit PIN. Never include `childPins` in `saveOnboardingDraft`.

The review step lists the adult, family, children, starter goals, starter rewards, and notification
preferences before calling `completeFamilySetup({ childPins, draft })`.

- [ ] **Step 5: Connect welcome, returning sign-in, and setup routes**

`WelcomeScreen` adds an optional returning-family button:

```ts
returningFamilyName?: string;
onReturn?: () => void;
```

`app/index.tsx` behavior:

- “Create family account” calls `signInAdult()`, then `beginFamilySetup`, and then pushes
  `/onboarding`.
- “Explore the family demo” calls `signInAdult()`, then `resetDemo`, only after explicit
  confirmation if persisted custom setup exists.
- “Continue with The Park Family” calls `signInAdult` and replaces the parent family route.

`app/onboarding.tsx` renders `OnboardingWizard` from the current draft and routes to the family
dashboard only after the complete command resolves.

- [ ] **Step 6: Run onboarding tests and refactor while green**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/onboarding/OnboardingWizard.test.tsx src/components/AppShell.test.tsx
pnpm --filter @fovari/mobile typecheck
pnpm --filter @fovari/mobile lint
```

Expected: onboarding journey, welcome shell, typecheck, and lint pass.

- [ ] **Step 7: Commit the onboarding wizard**

```powershell
git add apps/mobile/app/index.tsx apps/mobile/app/onboarding.tsx apps/mobile/src/components apps/mobile/src/features/onboarding apps/mobile/src/data/starter-content.ts
git commit -m "feat: build resumable family onboarding"
```

---

### Task 7: Child profile selection, PIN unlock, and safe handoff

**Files:**

- Replace: `apps/mobile/app/(child)/select-profile.tsx`
- Replace: `apps/mobile/app/(child)/unlock.tsx`
- Modify: `apps/mobile/app/(kiosk)/index.tsx`
- Modify: `apps/mobile/app/(parent)/(tabs)/family.tsx`
- Create: `apps/mobile/src/features/identity/ProfilePicker.tsx`
- Create: `apps/mobile/src/features/identity/ProfilePicker.test.tsx`
- Create: `apps/mobile/src/features/identity/ChildUnlockForm.tsx`
- Create: `apps/mobile/src/features/identity/ChildUnlockForm.test.tsx`

**Interfaces:**

- Consumes: `selectChild`, `unlockChild`, `signOut`, child summaries, and session guards.
- Produces: explicit parent-to-profile-picker handoff and rate-limited child unlock.

- [ ] **Step 1: Write the failing profile-picker test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDemoSeed } from "../../data/fixtures";
import { ProfilePicker } from "./ProfilePicker";

describe("ProfilePicker", () => {
  it("selects a child but does not open the child session itself", () => {
    const onSelect = vi.fn();
    render(<ProfilePicker children={createDemoSeed().children} onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText("Choose Alex"));

    expect(onSelect).toHaveBeenCalledWith("20000000-0000-4000-8000-000000000001");
    expect(screen.getByText("Who is using Fovari?")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the picker test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/identity/ProfilePicker.test.tsx
```

Expected: FAIL because `ProfilePicker` does not exist.

- [ ] **Step 3: Implement the accessible profile picker**

Each profile control must expose:

```tsx
<Pressable
  accessibilityHint={
    child.pinConfigured
      ? "Opens the secure PIN screen"
      : "Opens this child profile"
  }
  accessibilityLabel={`Choose ${child.name}`}
  accessibilityRole="button"
  onPress={() => onSelect(child.id)}
>
```

The route calls `selectChild(childId)` and always pushes `/unlock?childId=<id>`. Selection alone
does not change `activeActor`.

- [ ] **Step 4: Write the failing unlock-form tests**

```tsx
it("opens an unprotected profile and reports a wrong protected PIN", async () => {
  const unlockChild = vi
    .fn()
    .mockRejectedValueOnce(new Error("That PIN does not match. 2 tries left."))
    .mockResolvedValueOnce(createDemoSeed());

  render(
    <ChildUnlockForm
      child={{ ...createDemoSeed().children[0]!, pinConfigured: true }}
      unlockChild={unlockChild}
    />,
  );

  fireEvent.change(screen.getByLabelText("Alex PIN"), { target: { value: "1111" } });
  fireEvent.click(screen.getByText("Open Alex's space"));
  expect(await screen.findByText("That PIN does not match. 2 tries left.")).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the unlock-form test and verify red**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/identity/ChildUnlockForm.test.tsx
```

Expected: FAIL because `ChildUnlockForm` does not exist.

- [ ] **Step 6: Implement unlock and parent recovery**

The form:

- Omits the PIN field when `pinConfigured` is false.
- Uses numeric secure entry for configured profiles.
- Calls:

```ts
unlockChild({
  childId: child.id,
  now: Date.now(),
  ...(child.pinConfigured ? { pin } : {}),
});
```

- Preserves the PIN entry only until a result returns, then clears it.
- Displays remaining attempts or the formatted lockout.
- Offers “Ask a grown-up” which routes to the existing parent gate.
- Routes to child home only after the repository returns a child session.

The parent Family “Hand off” action must call `signOut()` and route to the profile picker; it must
not call `switchActor` directly. Kiosk “Open space” uses the same unlock route.

- [ ] **Step 7: Run identity, authorization, and existing flow tests**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/identity src/features/security/parent-gate.test.ts src/features/parent/parent-flow.test.tsx src/features/child/child-flow.test.tsx
pnpm --filter @fovari/mobile typecheck
pnpm --filter @fovari/mobile lint
```

Expected: all identity, parent-gate, parent-flow, child-flow, typecheck, and lint gates pass.

- [ ] **Step 8: Commit the safe child handoff**

```powershell
git add apps/mobile/app/\(child\) apps/mobile/app/\(kiosk\) apps/mobile/app/\(parent\)/\(tabs\)/family.tsx apps/mobile/src/features/identity
git commit -m "feat: secure local child handoff"
```

---

### Task 8: Journey verification, documentation, and browser evidence

**Files:**

- Modify: `README.md`
- Modify: `RELEASE.md`
- Modify: `docs/testing/local-release-1-evidence.md`
- Create: `docs/testing/family-setup-identity-evidence.md`
- Modify: `maestro/core-loop.yaml`

**Interfaces:**

- Consumes: the complete setup and identity journey.
- Produces: reproducible automated and browser evidence and a clean feature checkpoint.

- [ ] **Step 1: Add a rendered restart integration test**

Add to `apps/mobile/src/features/onboarding/OnboardingWizard.test.tsx`:

```ts
it("resumes at the persisted step without retaining a raw child PIN", () => {
  const draft = createDefaultOnboardingDraft();
  render(
    <OnboardingWizard
      busy={false}
      completeFamilySetup={vi.fn()}
      error={null}
      initialDraft={{
        ...draft,
        adultDisplayName: "Morgan",
        childDrafts: [
          {
            clientId: "draft-maya",
            displayName: "Maya",
            experienceMode: "explorer",
            pinRequested: true,
          },
        ],
      }}
      initialOnboarding={{
        completedSteps: ["adult", "family", "children"],
        currentStep: "starter_goals",
        status: "in_progress",
      }}
      saveOnboardingDraft={vi.fn()}
    />,
  );

  expect(screen.getByText("Choose starter goals")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("2468")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new restart test and verify it fails for the missing resume behavior**

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/onboarding/OnboardingWizard.test.tsx
```

Expected: FAIL until the wizard initializes from `initialOnboarding.currentStep`.

- [ ] **Step 3: Implement the minimal resume correction and verify green**

Initialize `step` exclusively from the persisted state:

```ts
const initialStep =
  initialOnboarding.currentStep === "complete" ? "review" : initialOnboarding.currentStep;
const [step, setStep] = useState(initialStep);
const [onboarding, setOnboarding] = useState(initialOnboarding);
```

Run:

```powershell
pnpm --filter @fovari/mobile test -- src/features/onboarding/OnboardingWizard.test.tsx
```

Expected: onboarding tests pass.

- [ ] **Step 4: Run the full local code gate**

Run:

```powershell
pnpm verify
```

Expected:

- Formatting passes.
- Lint passes with zero warnings.
- Typecheck passes.
- Every test file passes.
- Expo exports every route successfully.

- [ ] **Step 5: Run phone browser verification**

Start:

```powershell
pnpm --filter @fovari/mobile web -- --port 8090
```

At 390 by 844:

1. Open `/`.
2. Choose Create family account.
3. Complete all seven setup steps with synthetic Morgan/Maya data.
4. Confirm the parent dashboard shows only the new family.
5. Hand off.
6. Choose Maya.
7. Enter one wrong PIN and confirm “2 tries left.”
8. Enter the correct PIN.
9. Confirm child home shows Maya and the selected starter goal/reward.
10. Refresh and confirm the child session and family restore consistently.
11. Use the grown-up gate and sign out.
12. Confirm the returning-family affordance appears.

Expected: no console errors or warnings and no dead-end controls.

- [ ] **Step 6: Run tablet browser verification**

At 1180 by 820:

1. Open the returning family.
2. Confirm onboarding review, family dashboard, profile picker, and child home use tablet layouts.
3. Confirm the profile picker and child PIN remain keyboard accessible.
4. Confirm text scaling to 125 percent does not hide Continue, Create family, or Unlock.

Expected: no horizontal overflow, inaccessible controls, or console errors/warnings.

- [ ] **Step 7: Update documentation with observed results**

`docs/testing/family-setup-identity-evidence.md` must record:

- Exact branch and commit.
- Automated test counts from the fresh `pnpm verify`.
- Phone and tablet viewport sizes.
- Family, child, experience mode, and starter content used.
- Wrong-PIN and successful-unlock evidence.
- Refresh/restart evidence.
- Console disposition.
- Android, iOS, and Docker gates as unavailable unless newly observed.

Update README and RELEASE with:

- Create-family and returning-family instructions.
- Synthetic PIN warning.
- Demo reset behavior.
- No claim of production authentication.

- [ ] **Step 8: Run final hygiene and verification**

Run:

```powershell
pnpm format:check
git diff --check
rg -n --hidden -g '!pnpm-lock.yaml' -g '!output/**' -g '!.playwright-cli/**' "(sk_live|sk_test|service_role_key|SUPABASE_SERVICE_ROLE_KEY|eyJ[a-zA-Z0-9_-]{20,})" .
git status --short
```

Expected: formatting and diff checks pass, no secret pattern is found, and only intended journey
files are modified.

- [ ] **Step 9: Commit the verified journey**

```powershell
git add README.md RELEASE.md docs/testing maestro/core-loop.yaml apps/mobile
git commit -m "test: certify family setup identity journey"
```

## Journey completion boundary

Stop after Task 8 and report the Family Setup and Identity evidence. Do not begin advanced goal
types, offline completion, approvals, reward lifecycle, calendar editing, privacy deletion, or mock
subscription work until this journey is green and reconciled. Those systems receive separate
implementation plans under the approved functional local MVP design.
