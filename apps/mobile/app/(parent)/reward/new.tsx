import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RewardSummary } from "@fovari/api-client";
import { colors, radii, spacing } from "@fovari/design-system";

import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { FormField } from "../../../src/components/FormField";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import {
  createLocalCommandId,
  useFamilyAction,
  useFamilySnapshot,
} from "../../../src/hooks/use-family";

const rewardTypes: { emoji: string; label: string; value: RewardSummary["type"] }[] = [
  { emoji: "🎟️", label: "Experience", value: "experience" },
  { emoji: "🎮", label: "Privilege", value: "privilege" },
  { emoji: "🎁", label: "Item", value: "physical_item" },
  { emoji: "🏦", label: "Savings", value: "savings_goal" },
];

export default function NewRewardRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error: actionError, repository, run } = useFamilyAction();
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("100");
  const [type, setType] = useState<RewardSummary["type"]>("experience");
  const [error, setError] = useState<string | null>(null);
  if (!snapshot) return <LoadingState />;

  const submit = async () => {
    const pointCost = Number(points);
    if (!title.trim() || !Number.isSafeInteger(pointCost) || pointCost < 0) {
      setError("Add a reward name and a whole-number star cost.");
      return;
    }
    const idempotencyKey = createLocalCommandId("reward");
    await run(() =>
      repository.createReward(
        {
          eligibleChildIds: snapshot.children.map((child) => child.id),
          pointCost,
          title,
          type,
        },
        {
          actorId: snapshot.activeActor.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
    router.replace("/(parent)/(tabs)/rewards");
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <PageHeader
        actionLabel="Cancel"
        onAction={() => router.back()}
        subtitle="Make effort feel connected to something meaningful"
        title="Create a reward"
      />
      <Card>
        <Text style={styles.sectionTitle}>What are you celebrating toward?</Text>
        <FormField
          label="Reward name"
          onChangeText={setTitle}
          placeholder="Example: Family movie night"
          value={title}
        />
        <FormField inputMode="numeric" label="Star cost" onChangeText={setPoints} value={points} />
        <Text style={styles.label}>Reward type</Text>
        <View style={styles.types}>
          {rewardTypes.map((item) => {
            const selected = type === item.value;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={item.value}
                onPress={() => setType(item.value)}
                style={[styles.type, selected && styles.typeSelected]}
              >
                <Text style={styles.typeEmoji}>{item.emoji}</Text>
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.preview}>
          <Text style={styles.previewEyebrow}>FAMILY CATALOG PREVIEW</Text>
          <Text style={styles.previewTitle}>{title || "Your new reward"}</Text>
          <Text style={styles.previewCost}>{points || "0"} ★</Text>
        </View>
        {error || actionError ? <Text style={styles.error}>{error ?? actionError}</Text> : null}
        <Button loading={busy} onPress={() => void submit()}>
          Add to family catalog
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#A42C4E",
    fontSize: 13,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  preview: {
    backgroundColor: colors.lavender,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  previewCost: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  previewEyebrow: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  previewTitle: {
    color: colors.purpleDark,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: spacing.xl,
  },
  type: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 82,
    minWidth: 112,
    padding: spacing.md,
  },
  typeEmoji: {
    fontSize: 25,
  },
  typeLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  typeLabelSelected: {
    color: colors.purpleDark,
  },
  typeSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.purple,
  },
  types: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
});
