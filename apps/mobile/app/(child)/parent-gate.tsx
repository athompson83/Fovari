import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { DEMO_IDS } from "../../src/data/fixtures";
import { createParentGate } from "../../src/features/security/parent-gate";
import { useFamilyAction } from "../../src/hooks/use-family";

export default function ParentGateRoute() {
  const router = useRouter();
  const { busy, repository, run } = useFamilyAction();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const gate = useRef(createParentGate({ answer: "12", lockoutMs: 30_000, maxAttempts: 3 }));

  const unlock = async () => {
    const result = gate.current.attempt(answer, Date.now());
    if (!result.ok) {
      setError(
        result.remainingAttempts
          ? `That answer doesn’t match. ${result.remainingAttempts} ${
              result.remainingAttempts === 1 ? "try" : "tries"
            } left.`
          : "Too many attempts. Ask your grown-up and wait 30 seconds.",
      );
      return;
    }
    await run(() => repository.switchActor({ id: DEMO_IDS.parent, role: "family_owner" }));
    router.replace("/(parent)/(tabs)/family");
  };

  return (
    <View style={styles.screen}>
      <Card style={styles.card}>
        <View style={styles.lock}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
        <Text style={styles.eyebrow}>GROWN-UP CHECK</Text>
        <Text style={styles.title}>Adult controls are protected</Text>
        <Text style={styles.copy}>
          This simple challenge represents the local biometric or private parent-secret adapter.
        </Text>
        <Text style={styles.challenge}>What is 7 + 5?</Text>
        <TextInput
          accessibilityLabel="Parent gate answer"
          inputMode="numeric"
          onChangeText={setAnswer}
          placeholder="Answer"
          placeholderTextColor="#9298AA"
          secureTextEntry
          style={styles.input}
          value={answer}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button loading={busy} onPress={() => void unlock()}>
          Unlock grown-up controls
        </Button>
        <Button onPress={() => router.back()} tone="quiet">
          Go back
        </Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 480,
    width: "100%",
  },
  challenge: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  copy: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  error: {
    color: "#A42C4E",
    fontSize: 12,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 22,
    marginBottom: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  lock: {
    alignItems: "center",
    backgroundColor: colors.lavender,
    borderRadius: radii.pill,
    height: 70,
    justifyContent: "center",
    marginHorizontal: "auto",
    width: 70,
  },
  lockIcon: {
    fontSize: 30,
  },
  screen: {
    alignItems: "center",
    backgroundColor: colors.navy,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
