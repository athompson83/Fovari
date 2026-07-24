import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";
import { CreateGoalSchema } from "@fovari/validation";

import { Avatar } from "../../../src/components/Avatar";
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

export default function NewGoalRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error: actionError, repository, run } = useFamilyAction();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [points, setPoints] = useState("10");
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!snapshot) return <LoadingState />;

  const activeIds = selectedChildIds.length ? selectedChildIds : [snapshot.children[0]!.id];
  const submit = async () => {
    const parsed = CreateGoalSchema.safeParse({
      approvalRequired: true,
      category: "custom",
      childIds: activeIds,
      familyId: snapshot.familyId,
      goalType: "one_time",
      instructions: instructions || undefined,
      pointValue: Number(points),
      title,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check this goal and try again.");
      return;
    }

    const idempotencyKey = createLocalCommandId("goal");
    await run(() =>
      repository.createGoal(parsed.data, {
        actorId: snapshot.activeActor.id,
        familyId: snapshot.familyId,
        idempotencyKey,
      }),
    );
    router.replace("/(parent)/(tabs)/family");
  };

  const toggleChild = (childId: string) => {
    setSelectedChildIds((current) =>
      current.includes(childId)
        ? current.filter((item) => item !== childId)
        : [...current, childId],
    );
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <PageHeader
        actionLabel="Cancel"
        onAction={() => router.back()}
        subtitle="Clear, achievable, and easy to celebrate"
        title="Create a goal"
      />
      <View style={styles.steps}>
        <View style={[styles.step, styles.stepActive]} />
        <View style={styles.step} />
        <View style={styles.step} />
      </View>
      <Card>
        <Text style={styles.sectionTitle}>1. What does success look like?</Text>
        <FormField
          label="Goal title"
          onChangeText={setTitle}
          placeholder="Example: Read for 20 minutes"
          value={title}
        />
        <FormField
          label="Helpful instructions"
          multiline
          onChangeText={setInstructions}
          placeholder="What should your child know before starting?"
          value={instructions}
        />
        <FormField
          inputMode="numeric"
          label="Stars earned"
          onChangeText={setPoints}
          value={points}
        />

        <Text style={styles.label}>Who is this for?</Text>
        <View style={styles.children}>
          {snapshot.children.map((child, index) => {
            const selected =
              selectedChildIds.includes(child.id) || (!selectedChildIds.length && index === 0);
            return (
              <Pressable
                accessibilityLabel={`Assign to ${child.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={child.id}
                onPress={() => toggleChild(child.id)}
                style={[styles.childChip, selected && styles.childSelected]}
              >
                <Avatar name={child.name} size={34} />
                <Text style={[styles.childName, selected && styles.childNameSelected]}>
                  {child.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.approvalNote}>
          <Text style={styles.approvalTitle}>✓ Parent approval required</Text>
          <Text style={styles.approvalCopy}>
            Stars are appended to the ledger only after an authorized adult reviews the completion.
          </Text>
        </View>
        {error || actionError ? <Text style={styles.error}>{error ?? actionError}</Text> : null}
        <Button loading={busy} onPress={() => void submit()}>
          Review & create goal
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  approvalCopy: {
    color: colors.purpleDark,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  approvalNote: {
    backgroundColor: colors.lavender,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  approvalTitle: {
    color: colors.purpleDark,
    fontSize: 13,
    fontWeight: "900",
  },
  childChip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingRight: spacing.lg,
  },
  childName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: spacing.sm,
  },
  childNameSelected: {
    color: colors.purpleDark,
  },
  childSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.purple,
  },
  children: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
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
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: spacing.xl,
  },
  step: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    flex: 1,
    height: 5,
  },
  stepActive: {
    backgroundColor: colors.purple,
  },
  steps: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
