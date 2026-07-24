import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { asyncStorage, type KeyValueStorage } from "./local-storage";

const MAX_STORED_PIN_LENGTH = 512;
const MAX_STORED_VALUE_LENGTH = 128;
const MAX_MANAGED_CHILDREN = 500;
const PIN_REGISTRY_KEY = "fovari.child-pin.registry";
const PIN_REGISTRY_VERSION = 1;
const STORED_PIN_VERSION = 1;

interface StoredPin {
  digest: string;
  salt: string;
  version: 1;
}

interface StoredPinRegistry {
  childIds: readonly string[];
  version: 1;
}

export interface ChildPinVaultCheckpoint {
  readonly kind: "opaque-child-pin-vault-checkpoint";
}

export interface ChildPinVault {
  checkpoint(childIds?: readonly string[]): Promise<ChildPinVaultCheckpoint>;
  isConfigured(childId: string): Promise<boolean>;
  listManagedChildIds(): Promise<readonly string[]>;
  remove(childId: string): Promise<void>;
  restore(checkpoint: ChildPinVaultCheckpoint): Promise<void>;
  set(childId: string, pin: string): Promise<void>;
  verify(childId: string, pin: string): Promise<boolean>;
}

export interface ChildPinVaultOptions {
  digest?(value: string): Promise<string>;
  randomId?(): string;
  storage?: KeyValueStorage;
}

export interface ChildPinStorageSelection {
  appEnvironment: unknown;
  dataMode: unknown;
  platformOS: string;
  secureStorage?: KeyValueStorage;
  webStorage?: KeyValueStorage;
}

const keyFor = (childId: string) => `fovari.child-pin.${childId}`;

const isStoredValue = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_STORED_VALUE_LENGTH;

function parseStoredPin(serialized: string): StoredPin | null {
  if (serialized.length > MAX_STORED_PIN_LENGTH) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== 3
    ) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== STORED_PIN_VERSION ||
      !isStoredValue(record.digest) ||
      !isStoredValue(record.salt)
    ) {
      return null;
    }
    return { digest: record.digest, salt: record.salt, version: STORED_PIN_VERSION };
  } catch {
    return null;
  }
}

function parseStoredPinRegistry(serialized: string): StoredPinRegistry | null {
  if (serialized.length > MAX_STORED_PIN_LENGTH * MAX_MANAGED_CHILDREN) return null;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== 2
    ) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== PIN_REGISTRY_VERSION ||
      !Array.isArray(record.childIds) ||
      record.childIds.length > MAX_MANAGED_CHILDREN ||
      !record.childIds.every(isStoredValue) ||
      new Set(record.childIds).size !== record.childIds.length
    ) {
      return null;
    }
    return { childIds: record.childIds, version: PIN_REGISTRY_VERSION };
  } catch {
    return null;
  }
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

export function selectChildPinStorage({
  appEnvironment,
  dataMode,
  platformOS,
  secureStorage = secureStoreStorage,
  webStorage = asyncStorage,
}: ChildPinStorageSelection): KeyValueStorage {
  if (platformOS !== "web") return secureStorage;
  if ((appEnvironment === "local" || appEnvironment === "preview") && dataMode === "demo") {
    return webStorage;
  }
  throw new Error("Web child PIN storage is limited to synthetic demo data.");
}

// Web storage is only enabled for local/preview synthetic demo data. Production
// child credentials require a reviewed server/native credential design.
export function createConfiguredChildPinStorage(): KeyValueStorage {
  const expoExtra = Constants.expoConfig?.extra;
  return selectChildPinStorage({
    appEnvironment: expoExtra?.appEnvironment,
    dataMode: expoExtra?.dataMode,
    platformOS: Platform.OS,
  });
}

export function createChildPinVault(options: ChildPinVaultOptions = {}): ChildPinVault {
  const digest = options.digest ?? expoDigest;
  const randomId = options.randomId ?? expoRandomId;
  const resolveStorage = () => options.storage ?? createConfiguredChildPinStorage();
  const checkpoints = new WeakMap<
    ChildPinVaultCheckpoint,
    {
      credentials: ReadonlyMap<string, string | null>;
      registry: string | null;
    }
  >();

  const readManagedChildIds = async (): Promise<readonly string[]> => {
    const serialized = await resolveStorage().getItem(PIN_REGISTRY_KEY);
    if (!serialized) return [];
    const registry = parseStoredPinRegistry(serialized);
    if (!registry) {
      throw new Error("Invalid synthetic child PIN registry.");
    }
    return [...registry.childIds];
  };

  const writeManagedChildIds = async (childIds: readonly string[]) => {
    const uniqueChildIds = [...new Set(childIds)].sort();
    if (uniqueChildIds.length > MAX_MANAGED_CHILDREN || !uniqueChildIds.every(isStoredValue)) {
      throw new Error("Unable to store the synthetic child PIN registry.");
    }
    await resolveStorage().setItem(
      PIN_REGISTRY_KEY,
      JSON.stringify({ childIds: uniqueChildIds, version: PIN_REGISTRY_VERSION }),
    );
  };

  const createCheckpoint = async (
    childIds: readonly string[] = [],
  ): Promise<ChildPinVaultCheckpoint> => {
    const storage = resolveStorage();
    const managedChildIds = await readManagedChildIds();
    const capturedChildIds = [...new Set([...managedChildIds, ...childIds])].sort();
    if (capturedChildIds.length > MAX_MANAGED_CHILDREN || !capturedChildIds.every(isStoredValue)) {
      throw new Error("Unable to checkpoint synthetic child PIN credentials.");
    }

    const credentials = new Map<string, string | null>();
    for (const childId of capturedChildIds) {
      const serialized = await storage.getItem(keyFor(childId));
      if (serialized !== null && !parseStoredPin(serialized)) {
        throw new Error("Invalid synthetic child PIN credential.");
      }
      credentials.set(childId, serialized);
    }

    const checkpoint: ChildPinVaultCheckpoint = Object.freeze({
      kind: "opaque-child-pin-vault-checkpoint",
    });
    checkpoints.set(checkpoint, {
      credentials,
      registry: await storage.getItem(PIN_REGISTRY_KEY),
    });
    return checkpoint;
  };

  const restoreCheckpoint = async (checkpoint: ChildPinVaultCheckpoint) => {
    const captured = checkpoints.get(checkpoint);
    if (!captured) throw new Error("Synthetic child PIN checkpoint is not recognized.");
    const storage = resolveStorage();

    for (const [childId, serialized] of captured.credentials) {
      if (serialized === null) {
        await storage.removeItem(keyFor(childId));
      } else {
        await storage.setItem(keyFor(childId), serialized);
      }
    }
    if (captured.registry === null) {
      await storage.removeItem(PIN_REGISTRY_KEY);
    } else {
      await storage.setItem(PIN_REGISTRY_KEY, captured.registry);
    }

    for (const [childId, serialized] of captured.credentials) {
      if ((await storage.getItem(keyFor(childId))) !== serialized) {
        throw new Error("Synthetic child PIN credential compensation could not be verified.");
      }
    }
    if ((await storage.getItem(PIN_REGISTRY_KEY)) !== captured.registry) {
      throw new Error("Synthetic child PIN registry compensation could not be verified.");
    }
  };

  const compensateOrThrow = async (
    operation: string,
    cause: unknown,
    checkpoint: ChildPinVaultCheckpoint,
  ): Promise<never> => {
    const compensation = await restoreCheckpoint(checkpoint).then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ error, ok: false as const }),
    );
    if (!compensation.ok) {
      throw new AggregateError(
        [cause, compensation.error],
        `Inconsistent local demo credential state after failed ${operation}.`,
        { cause },
      );
    }
    throw cause;
  };

  const readStoredPin = async (childId: string): Promise<StoredPin | null> => {
    const storage = resolveStorage();
    const serialized = await storage.getItem(keyFor(childId));
    if (!serialized) return null;

    const stored = parseStoredPin(serialized);
    if (stored) return stored;

    await storage.removeItem(keyFor(childId));
    return null;
  };

  return {
    checkpoint: createCheckpoint,
    async isConfigured(childId) {
      return (await readStoredPin(childId)) !== null;
    },
    listManagedChildIds: readManagedChildIds,
    async remove(childId) {
      const checkpoint = await createCheckpoint([childId]);
      try {
        await resolveStorage().removeItem(keyFor(childId));
        await writeManagedChildIds(
          (await readManagedChildIds()).filter((managedChildId) => managedChildId !== childId),
        );
        if (await resolveStorage().getItem(keyFor(childId))) {
          throw new Error("Synthetic child PIN credential removal could not be verified.");
        }
      } catch (cause) {
        await compensateOrThrow("child PIN removal", cause, checkpoint);
      }
    },
    restore: restoreCheckpoint,
    async set(childId, pin) {
      const salt = randomId();
      const stored: StoredPin = {
        digest: await digest(`${salt}:${pin}`),
        salt,
        version: STORED_PIN_VERSION,
      };
      if (!isStoredValue(stored.digest) || !isStoredValue(stored.salt)) {
        throw new Error("Unable to store the synthetic child PIN.");
      }
      const checkpoint = await createCheckpoint([childId]);
      const serialized = JSON.stringify(stored);
      try {
        await resolveStorage().setItem(keyFor(childId), serialized);
        await writeManagedChildIds([...(await readManagedChildIds()), childId]);
        if ((await resolveStorage().getItem(keyFor(childId))) !== serialized) {
          throw new Error("Synthetic child PIN credential write could not be verified.");
        }
      } catch (cause) {
        await compensateOrThrow("child PIN write", cause, checkpoint);
      }
    },
    async verify(childId, pin) {
      const stored = await readStoredPin(childId);
      if (!stored) return false;
      return (await digest(`${stored.salt}:${pin}`)) === stored.digest;
    },
  };
}

export function createConfiguredChildPinVault(): ChildPinVault {
  return createChildPinVault({ storage: createConfiguredChildPinStorage() });
}
