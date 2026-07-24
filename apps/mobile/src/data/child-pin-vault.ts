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

const serializeDigest = (digest: string) =>
  Array.from(
    digest,
    (character) => character.codePointAt(0)?.toString(16).padStart(6, "0") ?? "",
  ).join("");

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
      await options.storage.setItem(
        keyFor(childId),
        JSON.stringify({ digest: serializeDigest(digest), salt }),
      );
    },
    async verify(childId, pin) {
      const serialized = await options.storage.getItem(keyFor(childId));
      if (!serialized) return false;
      const stored = JSON.parse(serialized) as StoredPin;
      return serializeDigest(await options.digest(`${stored.salt}:${pin}`)) === stored.digest;
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

// Web uses AsyncStorage only for the synthetic local preview. Production child
// credentials require a reviewed server/native credential design.
export const childPinStorage = Platform.OS === "web" ? asyncStorage : secureStoreStorage;
