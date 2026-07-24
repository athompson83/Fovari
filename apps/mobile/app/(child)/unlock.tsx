import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { Button } from "../../src/components/Button";
import { LoadingState } from "../../src/components/LoadingState";
import { Screen } from "../../src/components/Screen";
import { ChildUnlockForm } from "../../src/features/identity/ChildUnlockForm";
import { useFamilyAction, useFamilySnapshot } from "../../src/hooks/use-family";

export default function UnlockRoute() {
  const router = useRouter();
  const { childId: childIdParam } = useLocalSearchParams<{ childId?: string | string[] }>();
  const snapshot = useFamilySnapshot();
  const { repository, run } = useFamilyAction();

  if (!snapshot) return <LoadingState />;

  const childId = Array.isArray(childIdParam) ? childIdParam[0] : childIdParam;
  const child = snapshot.children.find((item) => item.id === childId);

  if (!child) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Choose a child profile first</Text>
        <Text style={styles.copy}>This unlock link is missing a valid local child profile.</Text>
        <Button onPress={() => router.replace("/(child)/select-profile")}>Back to profiles</Button>
        <Button onPress={() => router.push("/(child)/parent-gate")} tone="quiet">
          Ask a grown-up
        </Button>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.centered}>
      <ChildUnlockForm
        child={child}
        onParentRecovery={() => router.push("/(child)/parent-gate")}
        onUnlocked={() => router.replace("/(child)/(tabs)/home")}
        unlockChild={(input) => run(() => repository.unlockChild(input))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
  },
  copy: {
    color: colors.inkMuted,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
});
