import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { asyncStorage, type KeyValueStorage } from "./local-storage";

const MAX_STORED_PIN_LENGTH = 512;
const MAX_STORED_VALUE_LENGTH = 128;
const MAX_MANAGED_CHILDREN = 500;
const MAX_TRANSACTION_LENGTH = 1_000_000;
const PIN_TRANSACTION_KEY = "fovari.child-pin.pending-transaction";
const PIN_TRANSACTION_VERSION = 1;
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

interface StoredPinTransaction {
  credentials: readonly { childId: string; serialized: string | null }[];
  id: string;
  registry: string | null;
  version: 1;
}

export interface ChildPinVaultCheckpoint {
  readonly kind: "opaque-child-pin-vault-checkpoint";
}

export interface ChildPinVault {
  beginTransaction(childIds?: readonly string[]): Promise<string>;
  checkpoint(childIds?: readonly string[]): Promise<ChildPinVaultCheckpoint>;
  finalizeTransaction(transactionId: string): Promise<void>;
  getPendingTransactionId(): Promise<string | null>;
  isConfigured(childId: string): Promise<boolean>;
  listManagedChildIds(): Promise<readonly string[]>;
  remove(childId: string): Promise<void>;
  restore(checkpoint: ChildPinVaultCheckpoint): Promise<void>;
  rollbackTransaction(transactionId: string): Promise<void>;
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

const isTransactionId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= MAX_STORED_VALUE_LENGTH &&
  /^pin-tx-[A-Za-z0-9_-]+$/.test(value);

function parseStoredPinTransaction(serialized: string): StoredPinTransaction | null {
  if (serialized.length > MAX_TRANSACTION_LENGTH) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      Object.keys(parsed).length !== 4
    ) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      record.version !== PIN_TRANSACTION_VERSION ||
      !isTransactionId(record.id) ||
      !Array.isArray(record.credentials) ||
      record.credentials.length > MAX_MANAGED_CHILDREN ||
      !(record.registry === null || typeof record.registry === "string")
    ) {
      return null;
    }
    if (record.registry !== null && parseStoredPinRegistry(record.registry as string) === null) {
      return null;
    }
    const credentials: { childId: string; serialized: string | null }[] = [];
    for (const credential of record.credentials) {
      if (
        typeof credential !== "object" ||
        credential === null ||
        Array.isArray(credential) ||
        Object.keys(credential).length !== 2
      ) {
        return null;
      }
      const item = credential as Record<string, unknown>;
      if (
        !isStoredValue(item.childId) ||
        !(item.serialized === null || typeof item.serialized === "string") ||
        (typeof item.serialized === "string" && parseStoredPin(item.serialized) === null)
      ) {
        return null;
      }
      credentials.push({
        childId: item.childId,
        serialized: item.serialized as string | null,
      });
    }
    if (new Set(credentials.map((item) => item.childId)).size !== credentials.length) {
      return null;
    }
    return {
      credentials,
      id: record.id,
      registry: record.registry as string | null,
      version: PIN_TRANSACTION_VERSION,
    };
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

  const inconsistentStorageWrite = (operation: string, cause: unknown, detail: unknown) =>
    new AggregateError(
      [cause, detail],
      `Inconsistent local demo credential state after ambiguous ${operation}.`,
      { cause },
    );

  const writeStorageValue = async (key: string, next: string | null) => {
    const storage = resolveStorage();
    const prior = await storage.getItem(key);
    const write = await (next === null ? storage.removeItem(key) : storage.setItem(key, next)).then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ error, ok: false as const }),
    );
    if (write.ok) return;

    const readback = await storage.getItem(key).then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ error, ok: false as const }),
    );
    if (!readback.ok) {
      throw inconsistentStorageWrite("credential storage write", write.error, readback.error);
    }
    if (readback.value === next) return;
    if (readback.value === prior) throw write.error;
    throw inconsistentStorageWrite(
      "credential storage write",
      write.error,
      new Error("Credential storage readback matched neither prior nor candidate state."),
    );
  };

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
    await writeStorageValue(
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
    for (const [childId, serialized] of captured.credentials) {
      await writeStorageValue(keyFor(childId), serialized);
    }
    await writeStorageValue(PIN_REGISTRY_KEY, captured.registry);

    const storage = resolveStorage();
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

  const readPendingTransaction = async (): Promise<StoredPinTransaction | null> => {
    const serialized = await resolveStorage().getItem(PIN_TRANSACTION_KEY);
    if (!serialized) return null;
    const transaction = parseStoredPinTransaction(serialized);
    if (!transaction) {
      throw new Error("Invalid synthetic child PIN transaction journal.");
    }
    return transaction;
  };

  const beginTransaction = async (childIds: readonly string[] = []) => {
    if (await readPendingTransaction()) {
      throw new Error(
        "Inconsistent local demo credential state: a transaction is already pending.",
      );
    }
    const checkpoint = await createCheckpoint(childIds);
    const captured = checkpoints.get(checkpoint);
    if (!captured) throw new Error("Synthetic child PIN checkpoint is not recognized.");
    const id = `pin-tx-${randomId()}`;
    if (!isTransactionId(id)) {
      throw new Error("Unable to create a synthetic child PIN transaction identifier.");
    }
    const transaction: StoredPinTransaction = {
      credentials: [...captured.credentials].map(([childId, serialized]) => ({
        childId,
        serialized,
      })),
      id,
      registry: captured.registry,
      version: PIN_TRANSACTION_VERSION,
    };
    await writeStorageValue(PIN_TRANSACTION_KEY, JSON.stringify(transaction));
    return id;
  };

  const transactionFor = async (transactionId: string) => {
    const transaction = await readPendingTransaction();
    if (!transaction || transaction.id !== transactionId) {
      throw new Error("Inconsistent local demo credential transaction state.");
    }
    return transaction;
  };

  const rollbackTransaction = async (transactionId: string) => {
    const transaction = await transactionFor(transactionId);
    for (const credential of transaction.credentials) {
      await writeStorageValue(keyFor(credential.childId), credential.serialized);
    }
    await writeStorageValue(PIN_REGISTRY_KEY, transaction.registry);

    const storage = resolveStorage();
    for (const credential of transaction.credentials) {
      if ((await storage.getItem(keyFor(credential.childId))) !== credential.serialized) {
        throw new Error("Synthetic child PIN transaction rollback could not be verified.");
      }
    }
    if ((await storage.getItem(PIN_REGISTRY_KEY)) !== transaction.registry) {
      throw new Error("Synthetic child PIN registry rollback could not be verified.");
    }
  };

  const finalizeTransaction = async (transactionId: string) => {
    await transactionFor(transactionId);
    await writeStorageValue(PIN_TRANSACTION_KEY, null);
    if ((await resolveStorage().getItem(PIN_TRANSACTION_KEY)) !== null) {
      throw new Error("Synthetic child PIN transaction cleanup could not be verified.");
    }
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
    beginTransaction,
    checkpoint: createCheckpoint,
    finalizeTransaction,
    async getPendingTransactionId() {
      return (await readPendingTransaction())?.id ?? null;
    },
    async isConfigured(childId) {
      return (await readStoredPin(childId)) !== null;
    },
    listManagedChildIds: readManagedChildIds,
    async remove(childId) {
      const checkpoint = await createCheckpoint([childId]);
      try {
        await writeStorageValue(keyFor(childId), null);
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
    rollbackTransaction,
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
        await writeStorageValue(keyFor(childId), serialized);
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
