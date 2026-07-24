import { useRouter } from "expo-router";
import { useRef } from "react";
import { Alert, Platform } from "react-native";

import { WelcomeScreen } from "../src/components/WelcomeScreen";
import { LoadingState } from "../src/components/LoadingState";
import { isUntouchedDemoSnapshot } from "../src/features/onboarding/demo-baseline";
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

  const untouchedDemo = isUntouchedDemoSnapshot(snapshot);

  const confirmReplacement = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => {
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { style: "cancel", text: "Keep my family" },
      { onPress: onConfirm, style: "destructive", text: confirmLabel },
    ]);
  };

  const requestCreateFamily = () => {
    if (untouchedDemo) {
      void createFamily();
      return;
    }
    confirmReplacement(
      "Start over with a new family?",
      "Starting over will replace the family setup saved on this device.",
      "Start over",
      () => void createFamily(),
    );
  };

  const requestDemo = () => {
    if (untouchedDemo) {
      void openDemo();
      return;
    }
    confirmReplacement(
      "Replace your local family?",
      "Exploring the demo will replace the family setup saved on this device with synthetic demo data.",
      "Replace with demo",
      () => void openDemo(),
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
      onCreateAccount={requestCreateFamily}
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
