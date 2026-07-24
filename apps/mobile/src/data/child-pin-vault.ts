import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { asyncStorage, type KeyValueStorage } from "./local-storage";

const MAX_STORED_PIN_LENGTH = 512;
const MAX_STORED_VALUE_LENGTH = 128;
const STORED_PIN_VERSION = 1;

interface StoredPin {
  digest: string;
  salt: string;
  version: 1;
}

export interface ChildPinVault {
  isConfigured(childId: string): Promise<boolean>;
  remove(childId: string): Promise<void>;
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
    async isConfigured(childId) {
      return (await readStoredPin(childId)) !== null;
    },
    async remove(childId) {
      await resolveStorage().removeItem(keyFor(childId));
    },
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
      await resolveStorage().setItem(keyFor(childId), JSON.stringify(stored));
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
