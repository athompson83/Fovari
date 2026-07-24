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
  operation: "remove" | "set";
}

const createFailureStorage = () => {
  const base = createMemoryStorage();
  const failures: StorageFailureRule[] = [];
  const takeFailure = (operation: StorageFailureRule["operation"], key: string) => {
    const index = failures.findIndex(
      (failure) => failure.operation === operation && failure.key === key,
    );
    if (index < 0) return undefined;
    return failures.splice(index, 1)[0];
  };
  const storage: KeyValueStorage = {
    getItem: base.getItem,
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
    const { repository } = createRepositoryWithStorage(failures.storage);
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
