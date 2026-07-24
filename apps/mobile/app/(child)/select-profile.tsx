import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { LoadingState } from "../../src/components/LoadingState";
import { Screen } from "../../src/components/Screen";
import { ProfilePicker } from "../../src/features/identity/ProfilePicker";
import { useFamilyAction, useFamilySnapshot } from "../../src/hooks/use-family";

export default function SelectProfileRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { error, repository, run } = useFamilyAction();

  if (!snapshot) return <LoadingState />;

  const select = async (childId: string) => {
    await run(() => repository.selectChild(childId));
    router.push(`/(child)/unlock?childId=${encodeURIComponent(childId)}`);
  };

  return (
    <Screen contentContainerStyle={styles.centered}>
      <ProfilePicker children={snapshot.children} onSelect={(childId) => void select(childId)} />
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
