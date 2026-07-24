import type { FamilyRepository, FamilySnapshot } from "@fovari/api-client";
import { createStore } from "zustand/vanilla";

export type FamilyStoreStatus = "idle" | "loading" | "ready" | "error";

export interface FamilyStoreState {
  applySnapshot(snapshot: FamilySnapshot): void;
  error: string | null;
  initialize(): Promise<void>;
  snapshot: FamilySnapshot | null;
  status: FamilyStoreStatus;
}

export const createFamilyStore = (repository: FamilyRepository) =>
  createStore<FamilyStoreState>((set) => ({
    applySnapshot(snapshot) {
      set({
        error: null,
        snapshot: structuredClone(snapshot),
        status: "ready",
      });
    },
    error: null,
    async initialize() {
      set({ error: null, status: "loading" });
      try {
        const snapshot = await repository.getSnapshot();
        set({
          error: null,
          snapshot: structuredClone(snapshot),
          status: "ready",
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Unable to load the family.",
          status: "error",
        });
      }
    },
    snapshot: null,
    status: "idle",
  }));

export type FamilyStore = ReturnType<typeof createFamilyStore>;
