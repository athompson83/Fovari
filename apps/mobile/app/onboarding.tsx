import { useRouter } from "expo-router";

import type { CompleteFamilySetupInput, SaveOnboardingDraftInput } from "@fovari/api-client";

import { LoadingState } from "../src/components/LoadingState";
import { OnboardingWizard } from "../src/features/onboarding/OnboardingWizard";
import { createLocalCommandId, useFamilyAction, useFamilySnapshot } from "../src/hooks/use-family";

export default function OnboardingRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();

  if (!snapshot) return <LoadingState />;

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
    <OnboardingWizard
      busy={busy}
      completeFamilySetup={completeFamilySetup}
      error={error}
      initialDraft={snapshot.onboardingDraft}
      initialOnboarding={snapshot.onboarding}
      saveOnboardingDraft={saveOnboardingDraft}
    />
  );
}
