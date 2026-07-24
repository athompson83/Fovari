import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { appEnvironment: "local", dataMode: "demo" } } },
}));

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: vi.fn(),
  getRandomBytes: vi.fn(),
}));

vi.mock("expo-secure-store", () => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import { createCommandContext } from "@fovari/api-client";

import { createChildPinVault } from "./child-pin-vault";
import { DEMO_IDS, createDemoSeed } from "./fixtures";
import { createLocalFamilyRepository } from "./local-family-repository";
import {
  createMemoryStorage,
  readLocalEnvelope,
  type KeyValueStorage,
  type LocalFamilyEnvelopeV1,
  writeLocalEnvelope,
} from "./local-storage";

const testDigest = async (value: string) =>
  `sha256-${Array.from(value)
    .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7)
    .toString(16)}`;

interface StorageFailureRule {
  after?: boolean;
  error: Error;
  key: string;
  operation: "get" | "remove" | "set";
  skip?: number;
}

const createFailureStorage = () => {
  const base = createMemoryStorage();
  const failures: StorageFailureRule[] = [];
  const takeFailure = (operation: StorageFailureRule["operation"], key: string) => {
    for (const [index, failure] of failures.entries()) {
      if (failure.operation !== operation || failure.key !== key) continue;
      if ((failure.skip ?? 0) > 0) {
        failure.skip = (failure.skip ?? 0) - 1;
        return undefined;
      }
      return failures.splice(index, 1)[0];
    }
    return undefined;
  };
  const storage: KeyValueStorage = {
    async getItem(key) {
      const failure = takeFailure("get", key);
      if (failure) throw failure.error;
      return base.getItem(key);
    },
    async removeItem(key) {
      const failure = takeFailure("remove", key);
      if (!failure?.after && failure) throw failure.error;
      await base.removeItem(key);
      if (failure) throw failure.error;
    },
    async setItem(key, value) {
      const failure = takeFailure("set", key);
      if (!failure?.after && failure) throw failure.error;
      await base.setItem(key, value);
      if (failure) throw failure.error;
    },
  };
  return {
    failNext(failure: StorageFailureRule) {
      failures.push(failure);
    },
    storage,
  };
};

const failFinalEnvelopeWriteAndReadback = (failures: ReturnType<typeof createFailureStorage>) => {
  failures.failNext({
    after: true,
    error: new Error("final envelope acknowledgement unavailable"),
    key: "fovari.local-family",
    operation: "set",
    skip: 1,
  });
  failures.failNext({
    error: new Error("immediate envelope readback unavailable"),
    key: "fovari.local-family",
    operation: "get",
  });
};

const createSetupDraft = (
  overrides: Partial<{
    childDrafts: {
      clientId: string;
      displayName: string;
      experienceMode: "adventurer" | "explorer" | "independence" | "launch";
      pinRequested: boolean;
    }[];
    selectedStarterGoalIds: string[];
    selectedStarterRewardIds: string[];
  }> = {},
) => ({
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
  ...overrides,
});

const createTestRepository = (seed = createDemoSeed()) => {
  const storage = createMemoryStorage();
  const pinVault = createChildPinVault({
    digest: testDigest,
    randomId: () => "test-salt",
    storage,
  });
  return {
    pinVault,
    repository: createLocalFamilyRepository({
      pinVault,
      seed,
      storage,
    }),
    storage,
  };
};

const createRepositoryWithStorage = (
  storage: KeyValueStorage,
  randomId: () => string = () => "test-salt",
) => {
  const pinVault = createChildPinVault({
    digest: testDigest,
    randomId,
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

describe("LocalFamilyRepository", () => {
  it("persists the first onboarding step before family and child details exist", async () => {
    const { repository } = createTestRepository();
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-first-step",
      }),
    );

    const saved = await repository.saveOnboardingDraft(
      {
        draft: {
          adultDisplayName: "Morgan",
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
        },
        onboarding: {
          completedSteps: ["adult"],
          currentStep: "family",
          status: "in_progress",
        },
      },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "save-first-step",
      }),
    );

    expect(saved.onboarding.currentStep).toBe("family");
    expect(saved.onboardingDraft?.adultDisplayName).toBe("Morgan");
  });

  it("persists a completed family setup and restores the adult session", async () => {
    const storage = createMemoryStorage();
    const pinVault = createChildPinVault({
      digest: testDigest,
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
    expect(completed.session).toEqual({ actorId: DEMO_IDS.parent, kind: "adult" });

    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });
    expect((await restored.getSnapshot()).familyName).toBe("The Park Family");
  });

  it.each([
    {
      childPins: { "draft-maya": "2468", unknown: "1357" },
      draft: createSetupDraft(),
      expected: "Unknown child PIN",
      label: "unknown client IDs",
    },
    {
      childPins: {},
      draft: createSetupDraft(),
      expected: "PIN is required",
      label: "missing requested PINs",
    },
    {
      childPins: { "draft-maya": "2468" },
      draft: createSetupDraft({
        childDrafts: [
          {
            clientId: "draft-maya",
            displayName: "Maya",
            experienceMode: "explorer",
            pinRequested: false,
          },
        ],
      }),
      expected: "PIN was not requested",
      label: "PINs for unrequested profiles",
    },
  ])("rejects $label before setup effects", async ({ childPins, draft, expected }) => {
    const { repository } = createTestRepository();
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: `begin-${draft.childDrafts[0]!.pinRequested}-${expected}`,
      }),
    );

    await expect(
      repository.completeFamilySetup(
        { childPins, draft },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: `complete-${expected}`,
        }),
      ),
    ).rejects.toThrow(expected);
  });

  it("validates every child PIN before IDs or vault writes and preserves retry sequence", async () => {
    const randomId = vi.fn(() => "test-salt");
    const storage = createMemoryStorage();
    const { repository } = createRepositoryWithStorage(storage, randomId);
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-invalid-later-pin",
      }),
    );
    randomId.mockClear();
    const draft = createSetupDraft({
      childDrafts: [
        {
          clientId: "draft-maya",
          displayName: "Maya",
          experienceMode: "explorer",
          pinRequested: true,
        },
        {
          clientId: "draft-june",
          displayName: "June",
          experienceMode: "adventurer",
          pinRequested: true,
        },
      ],
    });

    await expect(
      repository.completeFamilySetup(
        { childPins: { "draft-june": "12", "draft-maya": "2468" }, draft },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "invalid-later-pin",
        }),
      ),
    ).rejects.toThrow("4 to 6 digit PIN");
    expect(randomId).not.toHaveBeenCalled();

    const completed = await repository.completeFamilySetup(
      { childPins: { "draft-june": "1357", "draft-maya": "2468" }, draft },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "valid-pin-retry",
      }),
    );
    expect(completed.children.map((child) => child.id)).toEqual([
      "90000000-0000-4000-8000-000000000001",
      "90000000-0000-4000-8000-000000000002",
    ]);
  });

  it("rejects unknown starter content without consuming the persisted ID sequence", async () => {
    const { pinVault, repository } = createTestRepository();
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-unknown-starter-test",
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
      selectedStarterGoalIds: ["unknown-starter"],
      selectedStarterRewardIds: [],
      timezone: "America/New_York",
    };

    await expect(
      repository.completeFamilySetup(
        { childPins: { "draft-maya": "2468" }, draft },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "complete-unknown-starter",
        }),
      ),
    ).rejects.toThrow("Unknown starter");
    expect(await pinVault.isConfigured("90000000-0000-4000-8000-000000000001")).toBe(false);

    const completed = await repository.completeFamilySetup(
      {
        childPins: { "draft-maya": "2468" },
        draft: { ...draft, selectedStarterGoalIds: ["starter-reading"] },
      },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-known-starter",
      }),
    );
    expect(completed.children[0]?.id).toBe("90000000-0000-4000-8000-000000000001");
  });

  it("keeps the existing create-child command valid after naming a persisted setup", async () => {
    const { pinVault, repository, storage } = createTestRepository();
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-create-child-test",
      }),
    );
    await repository.createFamily(
      {
        name: "The Park Family",
        pointsName: "Stars",
        timezone: "America/New_York",
      },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "name-family-before-child",
      }),
    );

    const created = await repository.createChild(
      {
        displayName: "Maya",
        experienceMode: "explorer",
        familyId: DEMO_IDS.family,
      },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "create-child-during-setup",
      }),
    );

    expect(created.activeChildId).toBe(created.children[0]?.id);
    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });
    expect((await restored.getSnapshot()).children[0]?.name).toBe("Maya");
  });

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

  it("persists child PIN lockout state across repository hydration", async () => {
    const { pinVault, repository, storage } = await createCompletedFamilyWithPin("2468");

    await expect(
      repository.unlockChild({ childId: DEMO_IDS.alex, now: 1_000, pin: "1111" }),
    ).rejects.toThrow("2 tries left");
    await expect(
      repository.unlockChild({ childId: DEMO_IDS.alex, now: 2_000, pin: "1111" }),
    ).rejects.toThrow("1 tries left");
    await expect(
      repository.unlockChild({ childId: DEMO_IDS.alex, now: 3_000, pin: "1111" }),
    ).rejects.toThrow("Profile locked until");

    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });
    await expect(
      restored.unlockChild({ childId: DEMO_IDS.alex, now: 4_000, pin: "2468" }),
    ).rejects.toThrow("Profile locked until");

    expect(
      (
        await restored.unlockChild({
          childId: DEMO_IDS.alex,
          now: 34_000,
          pin: "2468",
        })
      ).session.kind,
    ).toBe("child");
  });

  it("does not let switchActor bypass a configured child PIN", async () => {
    const { repository } = await createCompletedFamilyWithPin("2468");

    await expect(
      repository.switchActor({
        childId: DEMO_IDS.alex,
        id: DEMO_IDS.alex,
        role: "child",
      }),
    ).rejects.toThrow("PIN unlock");
  });

  it("removes configured PINs and restores the exact demo envelope on reset", async () => {
    const { pinVault, repository } = await createCompletedFamilyWithPin("2468");

    const reset = await repository.resetDemo(
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "reset-demo",
      }),
    );

    expect(reset).toEqual(createDemoSeed());
    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
  });

  it("restores an overwritten PIN when the envelope commit fails", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-original-pin",
      }),
    );
    failures.failNext({
      error: new Error("envelope write failed"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    await expect(
      repository.configureChildPin(
        { childId: DEMO_IDS.alex, pin: "1357" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "replace-pin",
        }),
      ),
    ).rejects.toThrow("envelope write failed");
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.verify(DEMO_IDS.alex, "1357")).toBe(false);

    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "1357" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "replace-pin",
      }),
    );
    expect(await pinVault.verify(DEMO_IDS.alex, "1357")).toBe(true);
  });

  it("cleans managed credentials when beginning a replacement setup", async () => {
    const { pinVault, repository } = await createCompletedFamilyWithPin("2468");

    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-replacement",
      }),
    );

    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
    expect(await pinVault.listManagedChildIds()).toEqual([]);
  });

  it("restores managed credentials when begin replacement persistence fails", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-begin-failure",
      }),
    );
    failures.failNext({
      error: new Error("begin envelope write failed"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    await expect(
      repository.beginFamilySetup(
        { adultDisplayName: "Morgan" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "begin-replacement-failure",
        }),
      ),
    ).rejects.toThrow("begin envelope write failed");
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
  });

  it("restores managed credentials when reset persistence fails", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-reset-failure",
      }),
    );
    failures.failNext({
      error: new Error("reset envelope write failed"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    await expect(
      repository.resetDemo(
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "reset-failure",
        }),
      ),
    ).rejects.toThrow("reset envelope write failed");
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
  });

  it("cleans registry-owned orphan credentials during reset", async () => {
    const storage = createMemoryStorage();
    const { pinVault, repository } = createRepositoryWithStorage(storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-orphan",
      }),
    );
    const envelope = await readLocalEnvelope(storage, createDemoSeed());
    await writeLocalEnvelope(storage, {
      ...envelope,
      offlineActions: [],
      pinAttempts: {},
      snapshot: {
        ...envelope.snapshot,
        achievements: [],
        activeActor: { id: DEMO_IDS.parent, role: "family_owner" },
        activeChildId: "",
        calendar: [],
        children: [],
        completions: [],
        familyName: "",
        goals: [],
        ledger: [],
        onboarding: {
          completedSteps: [],
          currentStep: "adult",
          status: "not_started",
        },
        redemptions: [],
        rewards: [],
        selectedRewardByChild: {},
        session: { actorId: DEMO_IDS.parent, kind: "adult" },
      },
    });
    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });

    await restored.resetDemo(
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "reset-orphan",
      }),
    );

    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
    expect(await pinVault.listManagedChildIds()).toEqual([]);
  });

  it("cleans replaced credentials when completing setup without a prior begin", async () => {
    const { pinVault, repository } = await createCompletedFamilyWithPin("2468");

    const completed = await repository.completeFamilySetup(
      {
        childPins: { "draft-maya": "1357" },
        draft: createSetupDraft(),
      },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-replacement",
      }),
    );

    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
    expect(await pinVault.verify(completed.children[0]!.id, "1357")).toBe(true);
    expect(await pinVault.listManagedChildIds()).toEqual([completed.children[0]!.id]);
  });

  it("restores replaced credentials when complete setup persistence fails", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-complete-failure",
      }),
    );
    failures.failNext({
      error: new Error("complete envelope write failed"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    await expect(
      repository.completeFamilySetup(
        {
          childPins: { "draft-maya": "1357" },
          draft: createSetupDraft(),
        },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "complete-replacement-failure",
        }),
      ),
    ).rejects.toThrow("complete envelope write failed");
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.isConfigured("90000000-0000-4000-8000-000000000001")).toBe(false);
  });

  it("rolls back a partial multi-child vault write without consuming sequence", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-partial-vault",
      }),
    );
    const draft = createSetupDraft({
      childDrafts: [
        {
          clientId: "draft-maya",
          displayName: "Maya",
          experienceMode: "explorer",
          pinRequested: true,
        },
        {
          clientId: "draft-june",
          displayName: "June",
          experienceMode: "adventurer",
          pinRequested: true,
        },
      ],
    });
    failures.failNext({
      error: new Error("second child vault write failed"),
      key: "fovari.child-pin.90000000-0000-4000-8000-000000000002",
      operation: "set",
    });

    await expect(
      repository.completeFamilySetup(
        { childPins: { "draft-june": "1357", "draft-maya": "2468" }, draft },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "partial-vault-failure",
        }),
      ),
    ).rejects.toThrow("second child vault write failed");
    expect(await pinVault.listManagedChildIds()).toEqual([]);

    const completed = await repository.completeFamilySetup(
      { childPins: { "draft-june": "1357", "draft-maya": "2468" }, draft },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "partial-vault-failure",
      }),
    );
    expect(completed.children.map((child) => child.id)).toEqual([
      "90000000-0000-4000-8000-000000000001",
      "90000000-0000-4000-8000-000000000002",
    ]);
  });

  it("surfaces an explicit inconsistent-demo error when multi-child compensation fails", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-compensation-failure",
      }),
    );
    const draft = createSetupDraft({
      childDrafts: [
        {
          clientId: "draft-maya",
          displayName: "Maya",
          experienceMode: "explorer",
          pinRequested: true,
        },
        {
          clientId: "draft-june",
          displayName: "June",
          experienceMode: "adventurer",
          pinRequested: true,
        },
      ],
    });
    failures.failNext({
      error: new Error("second child vault write failed"),
      key: "fovari.child-pin.90000000-0000-4000-8000-000000000002",
      operation: "set",
    });
    failures.failNext({
      error: new Error("credential compensation failed"),
      key: "fovari.child-pin.90000000-0000-4000-8000-000000000001",
      operation: "remove",
    });

    const failure = await repository
      .completeFamilySetup(
        { childPins: { "draft-june": "1357", "draft-maya": "2468" }, draft },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "compensation-failure",
        }),
      )
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toContain(
      "Inconsistent local demo credential state",
    );
    expect((failure as AggregateError).cause).toEqual(
      expect.objectContaining({ message: "second child vault write failed" }),
    );
    expect((failure as AggregateError).errors).toEqual([
      expect.objectContaining({ message: "second child vault write failed" }),
      expect.objectContaining({ message: "credential compensation failed" }),
    ]);

    const downstreamContext = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "after-compensation-failure",
    });
    const downstreamReward = {
      eligibleChildIds: [],
      pointCost: 25,
      title: "After compensation recovery",
      type: "privilege" as const,
    };
    for (const message of [
      "snapshot rollback still unavailable",
      "actor rollback still unavailable",
      "mutation rollback still unavailable",
    ]) {
      failures.failNext({
        error: new Error(message),
        key: "fovari.child-pin.90000000-0000-4000-8000-000000000001",
        operation: "remove",
      });
    }

    await expect(repository.getSnapshot()).rejects.toThrow("snapshot rollback still unavailable");
    await expect(
      repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" }),
    ).rejects.toThrow("actor rollback still unavailable");
    await expect(repository.createReward(downstreamReward, downstreamContext)).rejects.toThrow(
      "mutation rollback still unavailable",
    );

    const recovered = await repository.getSnapshot();
    const durable = await readLocalEnvelope(failures.storage, createDemoSeed());
    expect(recovered.children).toEqual([]);
    expect(recovered.session.kind).toBe("adult");
    expect(await pinVault.listManagedChildIds()).toEqual([]);
    expect(await pinVault.getPendingTransactionId()).toBeNull();
    expect(durable.pendingCredentialTransactionId).toBeUndefined();
    expect(durable.processedCommandIds).not.toContain("compensation-failure");
    expect(durable.processedCommandIds).not.toContain(downstreamContext.idempotencyKey);
    expect(durable.nextSequence).toBe(1);

    const committed = await repository.createReward(downstreamReward, downstreamContext);
    expect(committed.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");
  });

  it("quarantines a committed credential candidate until final journal cleanup recovers", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.getSnapshot();
    const configureContext = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "final-cleanup-configure",
    });
    failures.failNext({
      error: new Error("final journal cleanup failed"),
      key: "fovari.child-pin.pending-transaction",
      operation: "remove",
    });

    await expect(
      repository.configureChildPin({ childId: DEMO_IDS.alex, pin: "2468" }, configureContext),
    ).rejects.toThrow("final journal cleanup failed");

    const downstreamContext = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "after-final-cleanup-failure",
    });
    const downstreamReward = {
      eligibleChildIds: [DEMO_IDS.alex],
      pointCost: 25,
      title: "After cleanup recovery",
      type: "privilege" as const,
    };
    for (const message of [
      "snapshot cleanup still unavailable",
      "actor cleanup still unavailable",
      "mutation cleanup still unavailable",
    ]) {
      failures.failNext({
        error: new Error(message),
        key: "fovari.child-pin.pending-transaction",
        operation: "remove",
      });
    }

    await expect(repository.getSnapshot()).rejects.toThrow("snapshot cleanup still unavailable");
    await expect(
      repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" }),
    ).rejects.toThrow("actor cleanup still unavailable");
    await expect(repository.createReward(downstreamReward, downstreamContext)).rejects.toThrow(
      "mutation cleanup still unavailable",
    );

    const recovered = await repository.getSnapshot();
    const durable = await readLocalEnvelope(failures.storage, createDemoSeed());
    expect(recovered.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(recovered.session.kind).toBe("adult");
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.getPendingTransactionId()).toBeNull();
    expect(durable.pendingCredentialTransactionId).toBeUndefined();
    expect(durable.processedCommandIds).toContain(configureContext.idempotencyKey);
    expect(durable.processedCommandIds).not.toContain(downstreamContext.idempotencyKey);
    expect(durable.nextSequence).toBe(1);

    const committed = await repository.createReward(downstreamReward, downstreamContext);
    expect(committed.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");
  });

  it("serializes concurrent mutations in call order and restores their exact final state", async () => {
    const { pinVault, repository, storage } = createTestRepository();
    const [first, second] = await Promise.all([
      repository.createReward(
        {
          eligibleChildIds: [DEMO_IDS.alex],
          pointCost: 25,
          title: "First concurrent reward",
          type: "privilege",
        },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "concurrent-reward-first",
        }),
      ),
      repository.createReward(
        {
          eligibleChildIds: [DEMO_IDS.alex],
          pointCost: 30,
          title: "Second concurrent reward",
          type: "experience",
        },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "concurrent-reward-second",
        }),
      ),
    ]);

    expect(first.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");
    expect(second.rewards.slice(-2).map((reward) => reward.id)).toEqual([
      "90000000-0000-4000-8000-000000000001",
      "90000000-0000-4000-8000-000000000002",
    ]);

    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });
    expect((await restored.getSnapshot()).rewards.slice(-2).map((reward) => reward.title)).toEqual([
      "First concurrent reward",
      "Second concurrent reward",
    ]);
  });

  it("retries a failed mutation with the same command key and unconsumed sequence", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    const input = {
      eligibleChildIds: [DEMO_IDS.alex],
      pointCost: 25,
      title: "Retry reward",
      type: "privilege" as const,
    };
    const context = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "retry-reward",
    });
    failures.failNext({
      error: new Error("retry envelope write failed"),
      key: "fovari.local-family",
      operation: "set",
    });

    await expect(repository.createReward(input, context)).rejects.toThrow(
      "retry envelope write failed",
    );
    const retried = await repository.createReward(input, context);
    expect(retried.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");

    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage: failures.storage,
    });
    await expect(restored.createReward(input, context)).rejects.toThrow("already processed");
    const next = await restored.createReward(
      { ...input, title: "Next reward" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "next-reward",
      }),
    );
    expect(next.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000002");
  });

  it("treats an ordinary write-then-throw mutation as committed after exact readback", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    const input = {
      eligibleChildIds: [DEMO_IDS.alex],
      pointCost: 25,
      title: "Ambiguous committed reward",
      type: "privilege" as const,
    };
    const context = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "ambiguous-ordinary-commit",
    });
    failures.failNext({
      after: true,
      error: new Error("write acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
    });

    const committed = await repository.createReward(input, context);
    expect(committed.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");

    const restored = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage: failures.storage,
    });
    expect((await restored.getSnapshot()).rewards.at(-1)?.title).toBe(input.title);
    await expect(restored.createReward(input, context)).rejects.toThrow("already processed");
  });

  it("surfaces an explicit inconsistent state when an ordinary write cannot be read back", async () => {
    const base = createMemoryStorage();
    let failReadback = false;
    const storage: KeyValueStorage = {
      async getItem(key) {
        if (failReadback && key === "fovari.local-family") {
          throw new Error("readback unavailable");
        }
        return base.getItem(key);
      },
      removeItem: base.removeItem,
      async setItem(key, value) {
        if (key === "fovari.local-family") {
          failReadback = true;
          throw new Error("write outcome unknown");
        }
        await base.setItem(key, value);
      },
    };
    const { repository } = createRepositoryWithStorage(storage);

    await expect(
      repository.createReward(
        {
          eligibleChildIds: [DEMO_IDS.alex],
          pointCost: 25,
          title: "Unreadable commit",
          type: "privilege",
        },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "unreadable-ordinary-commit",
        }),
      ),
    ).rejects.toThrow("Inconsistent local demo envelope state after ambiguous write");
  });

  it("reads back a late-acknowledged marker before applying credential effects", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    failures.failNext({
      after: true,
      error: new Error("marker acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
    });

    const configured = await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "late-marker-configure",
      }),
    );

    expect(configured.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.getPendingTransactionId()).toBeNull();
  });

  it("does not apply credential effects when the marker is confirmed uncommitted", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    failures.failNext({
      error: new Error("marker rejected"),
      key: "fovari.local-family",
      operation: "set",
    });

    await expect(
      repository.configureChildPin(
        { childId: DEMO_IDS.alex, pin: "2468" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "rejected-marker-configure",
        }),
      ),
    ).rejects.toThrow("marker rejected");

    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
    expect(await pinVault.getPendingTransactionId()).toBeNull();
  });

  it("keeps a configured PIN when its final envelope write throws after committing", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    failures.failNext({
      after: true,
      error: new Error("configure write acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    const configured = await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "ambiguous-configure-commit",
      }),
    );

    expect(configured.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
  });

  it("keeps begin replacement committed after its final envelope write-then-throw", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-ambiguous-begin",
      }),
    );
    failures.failNext({
      after: true,
      error: new Error("begin write acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    const begun = await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "ambiguous-begin-commit",
      }),
    );

    expect(begun.children).toEqual([]);
    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
  });

  it("keeps completed setup committed after its final envelope write-then-throw", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.beginFamilySetup(
      { adultDisplayName: "Morgan" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "begin-before-ambiguous-complete",
      }),
    );
    failures.failNext({
      after: true,
      error: new Error("complete write acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    const completed = await repository.completeFamilySetup(
      { childPins: { "draft-maya": "2468" }, draft: createSetupDraft() },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "ambiguous-complete-commit",
      }),
    );

    expect(completed.familyName).toBe("The Park Family");
    expect(await pinVault.verify(completed.children[0]!.id, "2468")).toBe(true);
  });

  it("keeps reset committed after its final envelope write-then-throw", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-ambiguous-reset",
      }),
    );
    failures.failNext({
      after: true,
      error: new Error("reset write acknowledged late"),
      key: "fovari.local-family",
      operation: "set",
      skip: 1,
    });

    expect(
      await repository.resetDemo(
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "ambiguous-reset-commit",
        }),
      ),
    ).toEqual(createDemoSeed());
    expect(await pinVault.isConfigured(DEMO_IDS.alex)).toBe(false);
  });

  it("reloads a durable credential commit before same-instance getSnapshot", async () => {
    const failures = createFailureStorage();
    const { pinVault, repository } = createRepositoryWithStorage(failures.storage);
    const context = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "same-instance-configure-snapshot",
    });
    await repository.getSnapshot();
    failFinalEnvelopeWriteAndReadback(failures);

    const configure = repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      context,
    );
    const snapshotAfterMutation = repository.getSnapshot();
    await expect(configure).rejects.toThrow(
      "Inconsistent local demo envelope state after ambiguous write",
    );

    const recovered = await snapshotAfterMutation;
    expect(recovered.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.getPendingTransactionId()).toBeNull();
    await expect(
      repository.configureChildPin({ childId: DEMO_IDS.alex, pin: "2468" }, context),
    ).rejects.toThrow("already processed");
  });

  it("keeps quarantined reads and mutations closed while reconciliation is unavailable", async () => {
    const failures = createFailureStorage();
    const { repository } = createRepositoryWithStorage(failures.storage);
    await repository.getSnapshot();
    failFinalEnvelopeWriteAndReadback(failures);

    await expect(
      repository.configureChildPin(
        { childId: DEMO_IDS.alex, pin: "2468" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "unavailable-reconciliation-configure",
        }),
      ),
    ).rejects.toThrow("Inconsistent local demo envelope state after ambiguous write");

    failures.failNext({
      error: new Error("snapshot reconciliation unavailable"),
      key: "fovari.local-family",
      operation: "get",
    });
    await expect(repository.getSnapshot()).rejects.toThrow("snapshot reconciliation unavailable");

    failures.failNext({
      error: new Error("mutation reconciliation unavailable"),
      key: "fovari.local-family",
      operation: "get",
    });
    await expect(
      repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" }),
    ).rejects.toThrow("mutation reconciliation unavailable");

    const recovered = await repository.getSnapshot();
    expect(recovered.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(recovered.session.kind).toBe("adult");
  });

  it("reloads an ordinary durable commit before reusing the same instance", async () => {
    const failures = createFailureStorage();
    const { repository } = createRepositoryWithStorage(failures.storage);
    await repository.getSnapshot();
    const context = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "same-instance-ordinary-quarantine",
    });
    failures.failNext({
      after: true,
      error: new Error("ordinary acknowledgement unavailable"),
      key: "fovari.local-family",
      operation: "set",
    });
    failures.failNext({
      error: new Error("ordinary readback unavailable"),
      key: "fovari.local-family",
      operation: "get",
    });

    await expect(
      repository.createReward(
        {
          eligibleChildIds: [DEMO_IDS.alex],
          pointCost: 25,
          title: "Committed during ordinary quarantine",
          type: "privilege",
        },
        context,
      ),
    ).rejects.toThrow("Inconsistent local demo envelope state after ambiguous write");

    const recovered = await repository.getSnapshot();
    expect(recovered.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");
    await expect(
      repository.createReward(
        {
          eligibleChildIds: [DEMO_IDS.alex],
          pointCost: 25,
          title: "Committed during ordinary quarantine",
          type: "privilege",
        },
        context,
      ),
    ).rejects.toThrow("already processed");
  });

  it("fails same-instance actor switching closed after an ambiguous credential commit", async () => {
    const failures = createFailureStorage();
    const { repository } = createRepositoryWithStorage(failures.storage);
    await repository.getSnapshot();
    failFinalEnvelopeWriteAndReadback(failures);

    await expect(
      repository.configureChildPin(
        { childId: DEMO_IDS.alex, pin: "2468" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "same-instance-configure-switch",
        }),
      ),
    ).rejects.toThrow("Inconsistent local demo envelope state after ambiguous write");

    await expect(
      repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" }),
    ).rejects.toThrow("Use child PIN unlock for this profile");
    expect((await repository.getSnapshot()).session.kind).toBe("adult");
  });

  it("reconciles before a queued mutation can overwrite a durable credential commit", async () => {
    const failures = createFailureStorage();
    const { repository } = createRepositoryWithStorage(failures.storage);
    const configureContext = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "queued-configure",
    });
    const rewardContext = createCommandContext({
      actorId: DEMO_IDS.parent,
      familyId: DEMO_IDS.family,
      idempotencyKey: "queued-reward",
    });
    await repository.getSnapshot();
    failFinalEnvelopeWriteAndReadback(failures);

    const configure = repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      configureContext,
    );
    const reward = repository.createReward(
      {
        eligibleChildIds: [DEMO_IDS.alex],
        pointCost: 25,
        title: "Queued after quarantine",
        type: "privilege",
      },
      rewardContext,
    );

    await expect(configure).rejects.toThrow(
      "Inconsistent local demo envelope state after ambiguous write",
    );
    const recovered = await reward;
    expect(recovered.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      true,
    );
    expect(recovered.rewards.at(-1)?.id).toBe("90000000-0000-4000-8000-000000000001");

    const durable = await readLocalEnvelope(failures.storage, createDemoSeed());
    expect(durable.processedCommandIds).toEqual(
      expect.arrayContaining([configureContext.idempotencyKey, rewardContext.idempotencyKey]),
    );
    expect(durable.nextSequence).toBe(2);
    expect(durable.pendingCredentialTransactionId).toBeUndefined();
  });

  it("rolls back a pending credential journal and marker during process recreation", async () => {
    const storage = createMemoryStorage();
    const { pinVault, repository } = createRepositoryWithStorage(storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-restart-rollback",
      }),
    );
    const transactionId = await pinVault.beginTransaction([DEMO_IDS.alex]);
    const envelope = await readLocalEnvelope(storage, createDemoSeed());
    await writeLocalEnvelope(storage, {
      ...envelope,
      pendingCredentialTransactionId: transactionId,
    });
    await pinVault.set(DEMO_IDS.alex, "1357");

    const recreated = createLocalFamilyRepository({
      pinVault: createChildPinVault({
        digest: testDigest,
        randomId: () => "restart-salt",
        storage,
      }),
      seed: createDemoSeed(),
      storage,
    });
    await recreated.getSnapshot();

    expect(await pinVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await pinVault.verify(DEMO_IDS.alex, "1357")).toBe(false);
    expect(
      (await readLocalEnvelope(storage, createDemoSeed())).pendingCredentialTransactionId,
    ).toBeUndefined();
    expect(await pinVault.getPendingTransactionId()).toBeNull();
  });

  it("finalizes an orphan journal when the final envelope was already committed", async () => {
    const storage = createMemoryStorage();
    const { pinVault, repository } = createRepositoryWithStorage(storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-finalized-restart",
      }),
    );
    const transactionId = await pinVault.beginTransaction([DEMO_IDS.alex]);
    const marked = {
      ...(await readLocalEnvelope(storage, createDemoSeed())),
      pendingCredentialTransactionId: transactionId,
    };
    await writeLocalEnvelope(storage, marked);
    await pinVault.remove(DEMO_IDS.alex);
    const finalEnvelope: LocalFamilyEnvelopeV1 = {
      ...marked,
      snapshot: {
        ...marked.snapshot,
        children: marked.snapshot.children.map((child) =>
          child.id === DEMO_IDS.alex ? { ...child, pinConfigured: false } : child,
        ),
      },
    };
    delete finalEnvelope.pendingCredentialTransactionId;
    await writeLocalEnvelope(storage, finalEnvelope);

    const recreatedVault = createChildPinVault({
      digest: testDigest,
      randomId: () => "restart-final-salt",
      storage,
    });
    const recreated = createLocalFamilyRepository({
      pinVault: recreatedVault,
      seed: createDemoSeed(),
      storage,
    });
    const snapshot = await recreated.getSnapshot();

    expect(snapshot.children.find((child) => child.id === DEMO_IDS.alex)?.pinConfigured).toBe(
      false,
    );
    expect(await recreatedVault.isConfigured(DEMO_IDS.alex)).toBe(false);
    expect(await recreatedVault.getPendingTransactionId()).toBeNull();
  });

  it("finalizes a journal created before its envelope marker without changing credentials", async () => {
    const storage = createMemoryStorage();
    const { pinVault, repository } = createRepositoryWithStorage(storage);
    await repository.configureChildPin(
      { childId: DEMO_IDS.alex, pin: "2468" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "configure-before-orphan-journal",
      }),
    );
    await pinVault.beginTransaction([DEMO_IDS.alex]);

    const recreatedVault = createChildPinVault({
      digest: testDigest,
      randomId: () => "restart-orphan-salt",
      storage,
    });
    const recreated = createLocalFamilyRepository({
      pinVault: recreatedVault,
      seed: createDemoSeed(),
      storage,
    });
    await recreated.getSnapshot();

    expect(await recreatedVault.verify(DEMO_IDS.alex, "2468")).toBe(true);
    expect(await recreatedVault.getPendingTransactionId()).toBeNull();
  });

  it("rejects a mismatched envelope marker and credential journal", async () => {
    const storage = createMemoryStorage();
    const { pinVault, repository } = createRepositoryWithStorage(storage);
    await repository.getSnapshot();
    await pinVault.beginTransaction([DEMO_IDS.alex]);
    const envelope = await readLocalEnvelope(storage, createDemoSeed());
    await writeLocalEnvelope(storage, {
      ...envelope,
      pendingCredentialTransactionId: "pin-tx-different",
    });
    const recreated = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });

    await expect(recreated.getSnapshot()).rejects.toThrow(
      "Inconsistent local demo credential transaction state",
    );
  });

  it("submits and approves a completion with exactly one immutable point credit", async () => {
    const { repository } = createTestRepository();
    const initial = await repository.getSnapshot();
    const initialPoints = initial.children.find((child) => child.id === DEMO_IDS.alex)!.points;

    await repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" });

    const submitted = await repository.submitCompletion(
      {
        childId: DEMO_IDS.alex,
        childNote: "I finished two chapters.",
        durationSeconds: 1_260,
        evidence: [],
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-reading-1",
        occurrenceId: DEMO_IDS.readingGoal,
      },
      createCommandContext({
        actorId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "complete-reading-1",
      }),
    );

    const completion = submitted.completions.at(-1)!;
    expect(completion.status).toBe("submitted");
    expect(submitted.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints,
    );

    await repository.switchActor({ id: DEMO_IDS.parent, role: "family_owner" });

    const approved = await repository.approveCompletion(
      { completionId: completion.id, parentNote: "Great consistency!" },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "approve-reading-1",
      }),
    );

    expect(approved.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints + 15,
    );
    expect(
      approved.ledger.filter((entry) => entry.idempotencyKey === "approve-reading-1"),
    ).toHaveLength(1);

    await expect(
      repository.approveCompletion(
        { completionId: completion.id },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "approve-reading-duplicate",
        }),
      ),
    ).rejects.toThrow("awaiting approval");
  });

  it("debits once for a reward request and preserves history through fulfillment and refund", async () => {
    const { repository } = createTestRepository();
    const initial = await repository.getSnapshot();
    const initialPoints = initial.children.find((child) => child.id === DEMO_IDS.alex)!.points;

    await repository.switchActor({ childId: DEMO_IDS.alex, id: DEMO_IDS.alex, role: "child" });

    const requested = await repository.requestRedemption(
      {
        childId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "request-movie-1",
        rewardId: DEMO_IDS.movieReward,
      },
      createCommandContext({
        actorId: DEMO_IDS.alex,
        familyId: DEMO_IDS.family,
        idempotencyKey: "request-movie-1",
      }),
    );

    const redemption = requested.redemptions.at(-1)!;
    expect(requested.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints - 100,
    );

    await repository.switchActor({ id: DEMO_IDS.parent, role: "family_owner" });

    await repository.decideRedemption(
      { decision: "approve", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "approve-movie-1",
      }),
    );
    const fulfilled = await repository.decideRedemption(
      { decision: "fulfill", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "fulfill-movie-1",
      }),
    );
    expect(fulfilled.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints - 100,
    );

    const refunded = await repository.decideRedemption(
      { decision: "refund", redemptionId: redemption.id },
      createCommandContext({
        actorId: DEMO_IDS.parent,
        familyId: DEMO_IDS.family,
        idempotencyKey: "refund-movie-1",
      }),
    );
    expect(refunded.children.find((child) => child.id === DEMO_IDS.alex)!.points).toBe(
      initialPoints,
    );
    expect(refunded.ledger.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(["redemption", "refund"]),
    );
  });

  it("rejects a reward request that would overdraw the point account", async () => {
    const { repository } = createTestRepository();

    await repository.switchActor({ childId: DEMO_IDS.june, id: DEMO_IDS.june, role: "child" });

    await expect(
      repository.requestRedemption(
        {
          childId: DEMO_IDS.june,
          familyId: DEMO_IDS.family,
          idempotencyKey: "request-headphones-1",
          rewardId: DEMO_IDS.headphonesReward,
        },
        createCommandContext({
          actorId: DEMO_IDS.june,
          familyId: DEMO_IDS.family,
          idempotencyKey: "request-headphones-1",
        }),
      ),
    ).rejects.toThrow("enough points");
  });

  it("does not authorize an owner when the synthetic session is signed out", async () => {
    const seed = createDemoSeed();
    const { repository } = createTestRepository({
      ...seed,
      session: { kind: "signed_out" },
    });

    await expect(
      repository.approveCompletion(
        { completionId: "completion-seed-june" },
        createCommandContext({
          actorId: DEMO_IDS.parent,
          familyId: DEMO_IDS.family,
          idempotencyKey: "signed-out-owner-approval",
        }),
      ),
    ).rejects.toThrow("active synthetic session");
  });

  it("does not authorize an actor whose session identity is inconsistent", async () => {
    const { repository } = createTestRepository();

    await expect(
      repository.approveCompletion(
        { completionId: "completion-seed-june" },
        createCommandContext({
          actorId: "other-adult",
          familyId: DEMO_IDS.family,
          idempotencyKey: "mismatched-owner-approval",
        }),
      ),
    ).rejects.toThrow("active synthetic session");
  });
});
