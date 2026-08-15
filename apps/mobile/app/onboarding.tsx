import { useRouter } from "expo-router";
import { useEffect } from "react";

import type { CompleteFamilySetupInput, SaveOnboardingDraftInput } from "@fovari/api-client";

import { LoadingState } from "../src/components/LoadingState";
import { RouteGuard } from "../src/components/RouteGuard";
import { OnboardingWizard } from "../src/features/onboarding/OnboardingWizard";
import { createLocalCommandId, useFamilyAction, useFamilySnapshot } from "../src/hooks/use-family";

export default function OnboardingRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();

  useEffect(() => {
    if (snapshot?.onboarding.status === "complete") {
      router.replace("/(parent)/(tabs)/family");
    }
  }, [router, snapshot?.onboarding.status]);

  if (!snapshot) return <LoadingState />;
  if (snapshot.onboarding.status === "complete") return <LoadingState />;

  const context = (prefix: string) => ({
    actorId: snapshot.activeActor.id,
    familyId: snapshot.familyId,
    idempotencyKey: createLocalCommandId(prefix),
  });

  const saveOnboardingDraft = (input: SaveOnboardingDraftInput) =>
    run(() => repository.saveOnboardingDraft(input, context("save-onboarding")));

  const completeFamilySetup = async (input: CompleteFamilySetupInput) => {
    await run(() => repository.completeFamilySetup(input, context("complete-family-setup")));
    router.replace("/(parent)/(tabs)/family");
  };

  return (
    <RouteGuard allow="adult" onRecover={() => router.replace("/")} session={snapshot.session}>
      <OnboardingWizard
        busy={busy}
        completeFamilySetup={completeFamilySetup}
        error={error}
        initialDraft={snapshot.onboardingDraft}
        initialOnboarding={snapshot.onboarding}
        saveOnboardingDraft={saveOnboardingDraft}
      />
    </RouteGuard>
  );
}
