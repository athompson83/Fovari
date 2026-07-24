import { describe, expect, it, vi } from "vitest";

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
