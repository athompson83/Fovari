import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { FormField } from "../src/components/FormField";
import { LoadingState } from "../src/components/LoadingState";
import { PageHeader } from "../src/components/PageHeader";
import { Screen } from "../src/components/Screen";
import { createLocalCommandId, useFamilyAction, useFamilySnapshot } from "../src/hooks/use-family";

export default function OnboardingRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  const [familyName, setFamilyName] = useState("The Rivera Family");
  const [parentName, setParentName] = useState("Jamie");
  if (!snapshot) return <LoadingState />;

  const continueSetup = async () => {
    const idempotencyKey = createLocalCommandId("family-setup");
    await run(() =>
      repository.createFamily(
        {
          name: familyName,
          pointsName: "Stars",
          timezone: "America/New_York",
        },
        {
          actorId: snapshot.activeActor.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
    router.replace("/(parent)/(tabs)/family");
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <PageHeader
        actionLabel="Back"
        onAction={() => router.back()}
        subtitle="Local preview · no account or real data"
        title="Set up your family"
      />
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>This is a safe setup preview.</Text>
        <Text style={styles.noticeCopy}>
          Nothing leaves this device. Use made-up names while exploring Fovari.
        </Text>
      </View>
      <Card>
        <Text style={styles.step}>STEP 1 OF 3</Text>
        <Text style={styles.title}>Start with the people, not the points.</Text>
        <Text style={styles.copy}>
          You can add children, choose age-adaptive experiences, and fine-tune permissions after
          this first step.
        </Text>
        <FormField
          label="Family name"
          onChangeText={setFamilyName}
          placeholder="Example: The Rivera Family"
          value={familyName}
        />
        <FormField
          label="Your display name"
          onChangeText={setParentName}
          placeholder="Example: Jamie"
          value={parentName}
        />
        <View style={styles.preference}>
          <Text style={styles.preferenceTitle}>★ Your family currency</Text>
          <Text style={styles.preferenceCopy}>
            Stars · children earn them only after adult approval
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          disabled={!familyName.trim() || !parentName.trim()}
          loading={busy}
          onPress={() => void continueSetup()}
        >
          Continue with synthetic family
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  error: {
    color: "#A42C4E",
    fontSize: 12,
    marginBottom: spacing.md,
  },
  notice: {
    backgroundColor: colors.lavender,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  noticeCopy: {
    color: colors.purpleDark,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  noticeTitle: {
    color: colors.purpleDark,
    fontSize: 14,
    fontWeight: "900",
  },
  preference: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  preferenceCopy: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 4,
  },
  preferenceTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  step: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
});
