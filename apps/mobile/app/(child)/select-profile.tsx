import { useRouter } from "expo-router";
import { useRef } from "react";
import { StyleSheet, Text } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { LoadingState } from "../../src/components/LoadingState";
import { Screen } from "../../src/components/Screen";
import { ProfilePicker } from "../../src/features/identity/ProfilePicker";
import { useFamilyAction, useFamilySnapshot } from "../../src/hooks/use-family";

export default function SelectProfileRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  const selectionInFlight = useRef(false);

  if (!snapshot) return <LoadingState />;

  const select = async (childId: string) => {
    if (selectionInFlight.current) return;
    selectionInFlight.current = true;
    try {
      const selected = await run(async () => {
        const next = await repository.selectChild(childId);
        if (next.activeChildId !== childId) {
          throw new Error("The selected profile was not saved. Try again.");
        }
        return next;
      });
      router.push(`/(child)/unlock?childId=${encodeURIComponent(selected.activeChildId)}`);
    } catch {
      // useFamilyAction exposes the recoverable message on this route.
    } finally {
      selectionInFlight.current = false;
    }
  };

  return (
    <Screen contentContainerStyle={styles.centered}>
      <ProfilePicker
        children={snapshot.children}
        disabled={busy}
        onParentRecovery={() => router.push("/(child)/parent-gate")}
        onSelect={(childId) => void select(childId)}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.recovery}>Grown-ups can recover access from the next screen.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
  },
  error: {
    color: "#A42C4E",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  recovery: {
    color: colors.inkMuted,
    marginTop: spacing.xl,
    textAlign: "center",
  },
});
