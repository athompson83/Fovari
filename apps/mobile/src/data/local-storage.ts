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
