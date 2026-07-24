import { useCallback, useState } from "react";

import type { FamilySnapshot } from "@fovari/api-client";

import { useAppServices, useFamilyStore } from "../providers/AppProviders";

export function useFamilySnapshot(): FamilySnapshot | null {
  return useFamilyStore((state) => state.snapshot);
}

export function useFamilyAction() {
  const { repository } = useAppServices();
  const applySnapshot = useFamilyStore((state) => state.applySnapshot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<FamilySnapshot>) => {
      setBusy(true);
      setError(null);
      try {
        const snapshot = await action();
        applySnapshot(snapshot);
        return snapshot;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Something went wrong.";
        setError(message);
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [applySnapshot],
  );

  return { busy, error, repository, run };
}

export const createLocalCommandId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
