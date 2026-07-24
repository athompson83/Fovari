import { useRouter } from "expo-router";
import { useRef } from "react";
import { Alert } from "react-native";

import { WelcomeScreen } from "../src/components/WelcomeScreen";
import { createDemoSeed } from "../src/data/fixtures";
import { LoadingState } from "../src/components/LoadingState";
import { createLocalCommandId, useFamilyAction, useFamilySnapshot } from "../src/hooks/use-family";

export default function WelcomeRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, repository, run } = useFamilyAction();
  const starting = useRef(false);

  if (!snapshot) return <LoadingState />;

  const signInAdult = () => run(() => repository.signInAdult());

  const createFamily = async () => {
    if (busy || starting.current) return;
    starting.current = true;
    try {
      const signedIn = await signInAdult();
      await run(() =>
        repository.beginFamilySetup(
          { adultDisplayName: signedIn.adult.displayName || "Grown-up" },
          {
            actorId: signedIn.activeActor.id,
            familyId: signedIn.familyId,
            idempotencyKey: createLocalCommandId("begin-family-setup"),
          },
        ),
      );
      router.push("/onboarding");
    } catch {
      Alert.alert("Unable to start setup", "Your existing local family was left unchanged.");
    } finally {
      starting.current = false;
    }
  };

  const openDemo = async () => {
    if (busy || starting.current) return;
    starting.current = true;
    try {
      const signedIn = await signInAdult();
      await run(() =>
        repository.resetDemo({
          actorId: signedIn.activeActor.id,
          familyId: signedIn.familyId,
          idempotencyKey: createLocalCommandId("reset-demo"),
        }),
      );
      router.replace("/(parent)/(tabs)/family");
    } catch {
      Alert.alert("Unable to open the demo", "Your existing local family was left unchanged.");
    } finally {
      starting.current = false;
    }
  };

  const demo = createDemoSeed();
  const hasPersistedCustomSetup =
    snapshot.onboardingDraft !== null ||
    snapshot.familyName !== demo.familyName ||
    snapshot.adult.displayName !== demo.adult.displayName ||
    snapshot.children.map(({ id, name }) => `${id}:${name}`).join("|") !==
      demo.children.map(({ id, name }) => `${id}:${name}`).join("|");

  const requestDemo = () => {
    if (!hasPersistedCustomSetup) {
      void openDemo();
      return;
    }
    Alert.alert(
      "Replace your local family?",
      "Exploring the demo will replace the family setup saved on this device with synthetic demo data.",
      [
        { style: "cancel", text: "Keep my family" },
        { onPress: () => void openDemo(), style: "destructive", text: "Replace with demo" },
      ],
    );
  };

  const returnToFamily = async () => {
    if (busy || starting.current) return;
    starting.current = true;
    try {
      await signInAdult();
      router.replace("/(parent)/(tabs)/family");
    } catch {
      Alert.alert("Unable to continue", "The local family could not be opened.");
    } finally {
      starting.current = false;
    }
  };

  const returningFamilyName =
    snapshot.onboarding.status === "complete" ? snapshot.familyName : undefined;

  return (
    <WelcomeScreen
      onCreateAccount={() => void createFamily()}
      onDemo={requestDemo}
      onOpenLink={(label) =>
        router.push({
          pathname: "/legal/[document]",
          params: { document: label.toLowerCase() },
        })
      }
      {...(returningFamilyName
        ? {
            onReturn: () => void returnToFamily(),
            returningFamilyName,
          }
        : {})}
    />
  );
}
