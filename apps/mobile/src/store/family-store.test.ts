import { describe, expect, it } from "vitest";

import { createDemoSeed } from "../data/fixtures";
import { createLocalFamilyRepository } from "../data/local-family-repository";
import { createMemoryStorage } from "../data/local-storage";
import { createFamilyStore } from "./family-store";

const createTestRepository = () =>
  createLocalFamilyRepository({
    pinVault: {
      async beginTransaction() {
        return "pin-tx-test";
      },
      async checkpoint() {
        return { kind: "opaque-child-pin-vault-checkpoint" };
      },
      async clearManagedCredentials() {},
      async finalizeTransaction() {},
      async getPendingTransactionId() {
        return null;
      },
      async isConfigured() {
        return false;
      },
      async listManagedChildIds() {
        return [];
      },
      async remove() {},
      async rollbackTransaction() {},
      async restore() {},
      async set() {},
      async verify() {
        return false;
      },
    },
    seed: createDemoSeed(),
    storage: createMemoryStorage(),
  });

describe("family store", () => {
  it("loads the repository snapshot into a ready state", async () => {
    const store = createFamilyStore(createTestRepository());

    expect(store.getState().status).toBe("idle");
    await store.getState().initialize();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().snapshot?.familyName).toBe("The Rivera Family");
  });

  it("accepts a confirmed repository snapshot without copying server objects into drafts", () => {
    const repository = createTestRepository();
    const store = createFamilyStore(repository);
    const confirmed = createDemoSeed();

    store.getState().applySnapshot(confirmed);

    expect(store.getState().snapshot).toEqual(confirmed);
    expect(store.getState().snapshot).not.toBe(confirmed);
  });

  it.each([
    ["malformed JSON", "{", "Invalid local family data"],
    ["an unsupported envelope", JSON.stringify({ version: 99 }), "Unsupported local family data"],
  ])("exposes initialization failure for %s", async (_label, serialized, expectedError) => {
    const repository = createLocalFamilyRepository({
      pinVault: {
        async beginTransaction() {
          return "pin-tx-test";
        },
        async checkpoint() {
          return { kind: "opaque-child-pin-vault-checkpoint" };
        },
        async clearManagedCredentials() {},
        async finalizeTransaction() {},
        async getPendingTransactionId() {
          return null;
        },
        async isConfigured() {
          return false;
        },
        async listManagedChildIds() {
          return [];
        },
        async remove() {},
        async rollbackTransaction() {},
        async restore() {},
        async set() {},
        async verify() {
          return false;
        },
      },
      seed: createDemoSeed(),
      storage: createMemoryStorage({ "fovari.local-family": serialized }),
    });
    const store = createFamilyStore(repository);

    await store.getState().initialize();

    expect(store.getState()).toMatchObject({
      error: expect.stringContaining(expectedError),
      snapshot: null,
      status: "error",
    });
  });
});
