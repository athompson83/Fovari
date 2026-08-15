import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type PropsWithChildren, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { Button } from "../src/components/Button";
import { LoadingState } from "../src/components/LoadingState";
import { Screen } from "../src/components/Screen";
import { AppProviders, useAppServices, useFamilyStore } from "../src/providers/AppProviders";

function AppInitializationGate({ children }: PropsWithChildren) {
  const { recoverLocalData } = useAppServices();
  const error = useFamilyStore((state) => state.error);
  const status = useFamilyStore((state) => state.status);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  if (status === "idle" || status === "loading") return <LoadingState />;
  if (status === "ready") return <>{children}</>;

  const recover = async () => {
    if (recovering) return;
    setRecovering(true);
    setRecoveryError(null);
    try {
      await recoverLocalData();
    } catch (cause) {
      setRecoveryError(
        cause instanceof Error ? cause.message : "Local recovery could not be completed.",
      );
    } finally {
      setRecovering(false);
    }
  };

  const requestRecovery = () => {
    const title = "Clear local family data?";
    const message =
      "This removes the saved synthetic family and child PIN credentials from this device. This cannot be undone.";
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) void recover();
      return;
    }
    Alert.alert(title, message, [
      { style: "cancel", text: "Keep my family" },
      { onPress: () => void recover(), style: "destructive", text: "Clear and start over" },
    ]);
  };

  return (
    <Screen>
      <View style={styles.recovery}>
        <Text style={styles.recoveryEmoji}>ðŸ›Ÿ</Text>
        <Text style={styles.recoveryTitle}>Local family needs recovery</Text>
        <Text accessibilityRole="alert" style={styles.recoveryCopy}>
          {error ?? "The saved local family could not be opened safely."}
        </Text>
        <Text style={styles.recoveryCopy}>
          You can clear the synthetic data saved on this device and return to a clean welcome
          screen.
        </Text>
        {recoveryError ? (
          <Text accessibilityRole="alert" style={styles.recoveryError}>
            {recoveryError}
          </Text>
        ) : null}
        <Button loading={recovering} onPress={requestRecovery}>
          Clear local data and start over
        </Button>
      </View>
    </Screen>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppInitializationGate>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: "#F7F8FC" },
            headerShadowVisible: false,
            headerShown: false,
          }}
        />
      </AppInitializationGate>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  recovery: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 360,
  },
  recoveryCopy: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 480,
    textAlign: "center",
  },
  recoveryEmoji: {
    fontSize: 42,
    marginBottom: spacing.md,
  },
  recoveryError: {
    color: "#A42C4E",
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  recoveryTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
