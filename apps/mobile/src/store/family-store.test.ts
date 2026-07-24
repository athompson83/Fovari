import { describe, expect, it } from "vitest";

import { createDemoSeed } from "../data/fixtures";
import { createLocalFamilyRepository } from "../data/local-family-repository";
import { createFamilyStore } from "./family-store";

describe("family store", () => {
  it("loads the repository snapshot into a ready state", async () => {
    const store = createFamilyStore(createLocalFamilyRepository(createDemoSeed()));

    expect(store.getState().status).toBe("idle");
    await store.getState().initialize();

    expect(store.getState().status).toBe("ready");
    expect(store.getState().snapshot?.familyName).toBe("The Rivera Family");
  });

  it("accepts a confirmed repository snapshot without copying server objects into drafts", () => {
    const repository = createLocalFamilyRepository(createDemoSeed());
    const store = createFamilyStore(repository);
    const confirmed = createDemoSeed();

    store.getState().applySnapshot(confirmed);

    expect(store.getState().snapshot).toEqual(confirmed);
    expect(store.getState().snapshot).not.toBe(confirmed);
  });
});
