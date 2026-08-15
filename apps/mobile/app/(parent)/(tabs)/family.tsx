import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";

import { spacing } from "@fovari/design-system";

import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { ParentDashboard } from "../../../src/features/parent/ParentDashboard";
import { useFamilyAction, useFamilySnapshot } from "../../../src/hooks/use-family";

export default function FamilyRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  const handoffInFlight = useRef(false);
  const mounted = useRef(true);
  const requestGeneration = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
      handoffInFlight.current = false;
    };
  }, []);

  if (!snapshot) {
    return <LoadingState />;
  }

  const handoff = async () => {
    if (handoffInFlight.current) return;
    handoffInFlight.current = true;
    const generation = ++requestGeneration.current;
    try {
      await run(() => repository.signOut());
      if (!mounted.current || requestGeneration.current !== generation) return;
      router.replace("/(child)/select-profile");
    } catch {
      // useFamilyAction exposes the recoverable message on this route.
    } finally {
      if (requestGeneration.current === generation) {
        handoffInFlight.current = false;
      }
    }
  };

  return (
    <Screen>
      <PageHeader
        actionLabel="Family settings"
        onAction={() => router.push("/(parent)/privacy")}
        subtitle={snapshot.familyName}
        title="Family"
      />
      <ParentDashboard
        handoffBusy={busy}
        onAdd={() => router.push("/(parent)/(tabs)/add")}
        onHandoff={() => void handoff()}
        onOpenApprovals={() => router.push("/(parent)/approvals")}
        snapshot={snapshot}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#A42C4E",
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
