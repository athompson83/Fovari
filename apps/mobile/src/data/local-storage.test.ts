import { describe, expect, it } from "vitest";

import { createDemoSeed } from "./fixtures";
import { createMemoryStorage, readLocalEnvelope, writeLocalEnvelope } from "./local-storage";

describe("versioned local family storage", () => {
  it("uses the supplied seed once and restores a written envelope", async () => {
    const storage = createMemoryStorage();
    const seed = createDemoSeed();
    const initial = await readLocalEnvelope(storage, seed);

    expect(initial.version).toBe(1);
    expect(initial.snapshot.familyName).toBe("The Rivera Family");

    const changed = {
      ...initial,
      snapshot: { ...initial.snapshot, familyName: "The Park Family" },
    };
    await writeLocalEnvelope(storage, changed);

    expect((await readLocalEnvelope(storage, seed)).snapshot.familyName).toBe("The Park Family");
  });

  it("rejects unsupported data without silently changing permissions", async () => {
    const storage = createMemoryStorage({
      "fovari.local-family": JSON.stringify({ version: 99 }),
    });

    await expect(readLocalEnvelope(storage, createDemoSeed())).rejects.toThrow(
      "Unsupported local family data",
    );
  });
});
