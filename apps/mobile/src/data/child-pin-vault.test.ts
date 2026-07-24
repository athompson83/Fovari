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

import * as Crypto from "expo-crypto";

import {
  createChildPinVault,
  expoDigest,
  expoRandomId,
  selectChildPinStorage,
} from "./child-pin-vault";
import { createMemoryStorage } from "./local-storage";

const opaqueDigest = async (value: string) =>
  `sha256-${Array.from(value)
    .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7)
    .toString(16)}`;

describe("child PIN vault", () => {
  it("stores an opaque salted digest and verifies the matching PIN", async () => {
    const storage = createMemoryStorage();
    const digest = vi.fn(opaqueDigest);
    const vault = createChildPinVault({
      digest,
      randomId: () => "salt-1",
      storage,
    });

    await vault.set("child-1", "2468");

    expect(digest).toHaveBeenCalledWith("salt-1:2468");
    expect(await vault.verify("child-1", "2468")).toBe(true);
    expect(await vault.verify("child-1", "1111")).toBe(false);

    const stored = JSON.parse((await storage.getItem("fovari.child-pin.child-1")) ?? "null");
    expect(stored).toEqual({
      digest: await opaqueDigest("salt-1:2468"),
      salt: "salt-1",
      version: 1,
    });
    expect(JSON.stringify(stored)).not.toContain("2468");
  });

  it("reports an unconfigured profile and supports removal", async () => {
    const vault = createChildPinVault({
      digest: opaqueDigest,
      randomId: () => "salt-2",
      storage: createMemoryStorage(),
    });

    expect(await vault.isConfigured("child-2")).toBe(false);
    await vault.set("child-2", "1357");
    await vault.remove("child-2");
    expect(await vault.isConfigured("child-2")).toBe(false);
  });

  it.each([
    ["malformed JSON", "{"],
    ["null", "null"],
    ["missing digest", JSON.stringify({ salt: "salt-3", version: 1 })],
    ["wrong field types", JSON.stringify({ digest: 7, salt: "salt-3", version: 1 })],
    ["oversized values", JSON.stringify({ digest: "d".repeat(129), salt: "salt-3", version: 1 })],
  ])("fails closed and clears a %s record", async (_label, serialized) => {
    const storage = createMemoryStorage({ "fovari.child-pin.child-3": serialized });
    const vault = createChildPinVault({
      digest: opaqueDigest,
      randomId: () => "salt-3",
      storage,
    });

    expect(await vault.isConfigured("child-3")).toBe(false);
    expect(await storage.getItem("fovari.child-pin.child-3")).toBeNull();

    await storage.setItem("fovari.child-pin.child-3", serialized);
    expect(await vault.verify("child-3", "2468")).toBe(false);
    expect(await storage.getItem("fovari.child-pin.child-3")).toBeNull();
  });

  it("binds default vault dependencies to Expo SHA-256 and 16 random bytes", async () => {
    vi.mocked(Crypto.digestStringAsync).mockResolvedValue("a".repeat(64));
    vi.mocked(Crypto.getRandomBytes).mockReturnValue(
      Uint8Array.from({ length: 16 }, (_, index) => index),
    );
    const storage = createMemoryStorage();
    const vault = createChildPinVault({ storage });

    await vault.set("child-4", "2468");

    expect(Crypto.getRandomBytes).toHaveBeenCalledWith(16);
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      "SHA-256",
      "000102030405060708090a0b0c0d0e0f:2468",
    );
    expect(await vault.verify("child-4", "2468")).toBe(true);
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      "SHA-256",
      "000102030405060708090a0b0c0d0e0f:2468",
    );
  });

  it("allows local/preview demo web storage and rejects non-demo web storage", () => {
    const webStorage = createMemoryStorage();
    const secureStorage = createMemoryStorage();

    expect(
      selectChildPinStorage({
        appEnvironment: "local",
        dataMode: "demo",
        platformOS: "web",
        secureStorage,
        webStorage,
      }),
    ).toBe(webStorage);
    expect(
      selectChildPinStorage({
        appEnvironment: "preview",
        dataMode: "demo",
        platformOS: "web",
        secureStorage,
        webStorage,
      }),
    ).toBe(webStorage);
    expect(() =>
      selectChildPinStorage({
        appEnvironment: "production",
        dataMode: "demo",
        platformOS: "web",
        secureStorage,
        webStorage,
      }),
    ).toThrow("synthetic demo data");
  });

  it("selects secure storage on native platforms", () => {
    const webStorage = createMemoryStorage();
    const secureStorage = createMemoryStorage();

    expect(
      selectChildPinStorage({
        appEnvironment: "production",
        dataMode: "live",
        platformOS: "ios",
        secureStorage,
        webStorage,
      }),
    ).toBe(secureStorage);
  });

  it("exposes the Expo crypto boundary helpers", async () => {
    vi.mocked(Crypto.digestStringAsync).mockResolvedValue("digest-value");
    vi.mocked(Crypto.getRandomBytes).mockReturnValue(Uint8Array.from({ length: 16 }, () => 255));

    await expect(expoDigest("salt:2468")).resolves.toBe("digest-value");
    expect(expoRandomId()).toBe("ff".repeat(16));
  });
});
