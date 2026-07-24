import { createContext, type PropsWithChildren, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand";

import type { FamilyRepository } from "@fovari/api-client";

import {
  createChildPinVault,
  createConfiguredChildPinStorage,
  expoDigest,
  expoRandomId,
} from "../data/child-pin-vault";
import { createDemoSeed } from "../data/fixtures";
import { createLocalFamilyRepository } from "../data/local-family-repository";
import { asyncStorage } from "../data/local-storage";
import { createFamilyStore, type FamilyStore, type FamilyStoreState } from "../store/family-store";

interface AppServices {
  familyStore: FamilyStore;
  repository: FamilyRepository;
}

const AppServicesContext = createContext<AppServices | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const services = useRef<AppServices | null>(null);
  if (!services.current) {
    const storage = asyncStorage;
    const childPinStorage = createConfiguredChildPinStorage();
    const pinVault = createChildPinVault({
      digest: expoDigest,
      randomId: expoRandomId,
      storage: childPinStorage,
    });
    const repository = createLocalFamilyRepository({
      pinVault,
      seed: createDemoSeed(),
      storage,
    });
    services.current = {
      familyStore: createFamilyStore(repository),
      repository,
    };
  }

  useEffect(() => {
    void services.current?.familyStore.getState().initialize();
  }, []);

  return (
    <AppServicesContext.Provider value={services.current}>{children}</AppServicesContext.Provider>
  );
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error("useAppServices must be used inside AppProviders");
  }
  return services;
}

export function useFamilyStore<T>(selector: (state: FamilyStoreState) => T): T {
  const { familyStore } = useAppServices();
  return useStore(familyStore, selector);
}
