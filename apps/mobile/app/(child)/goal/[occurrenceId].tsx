import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { FormField } from "../../../src/components/FormField";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { RouteGuard } from "../../../src/components/RouteGuard";
import { Screen } from "../../../src/components/Screen";
import {
  createLocalCommandId,
  useFamilyAction,
  useFamilySession,
  useFamilySnapshot,
} from "../../../src/hooks/use-family";

export default function GoalDetailRoute() {
  const router = useRouter();
  const session = useFamilySession();

  return (
    <RouteGuard
      allow="child"
      onRecover={() => router.replace("/(child)/select-profile")}
      session={session}
    >
      <GoalDetailContent />
    </RouteGuard>
  );
}

function GoalDetailContent() {
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId: string }>();
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  const [note, setNote] = useState("");
  const [timerStarted, setTimerStarted] = useState(false);
  if (!snapshot) return <LoadingState />;
  const child = snapshot.children.find((item) => item.id === snapshot.activeChildId);
  const goal = snapshot.goals.find(
    (item) => item.id === occurrenceId && item.childId === child?.id,
  );
  if (!child || !goal) {
    return (
      <Screen>
        <PageHeader
          actionLabel="Back"
          onAction={() => router.back()}
          subtitle="This goal is not available for the active profile."
          title="Goal details"
        />
        <EmptyState
          actionLabel="Back to goals"
          description="Choose a goal from your own goal list to continue safely."
          emoji="ðŸ§­"
          onAction={() => router.replace("/(child)/(tabs)/goals")}
          title="Goal not found"
        />
      </Screen>
    );
  }
  const mode = getAgeModeTokens(child.experienceMode);

  const submit = async () => {
    const idempotencyKey = createLocalCommandId("completion");
    await run(() =>
      repository.submitCompletion(
        {
          childId: child.id,
          childNote: note || undefined,
          durationSeconds: goal.verification === "timer" ? (timerStarted ? 1200 : 0) : undefined,
          evidence: [],
          familyId: snapshot.familyId,
          idempotencyKey,
          occurrenceId: goal.id,
        },
        {
          actorId: child.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
    router.replace("/(child)/(tabs)/goals");
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <PageHeader
        actionLabel="Back"
        onAction={() => router.back()}
        subtitle={goal.dueLabel}
        title="Goal details"
      />
      <View style={[styles.hero, { backgroundColor: mode.accent }]}>
        <View style={[styles.icon, { backgroundColor: mode.surface }]}>
          <Text style={styles.emoji}>{goal.category === "reading" ? "📚" : "✓"}</Text>
        </View>
        <Text style={styles.title}>{goal.title}</Text>
        <Text style={styles.points}>+{goal.pointValue} stars when approved</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.label}>WHAT TO DO</Text>
        <Text style={styles.instructions}>{goal.instructions}</Text>
      </Card>

      {goal.verification === "timer" ? (
        <Card style={styles.card}>
          <Text style={styles.label}>FOCUS TIMER</Text>
          <Text style={styles.timer}>{timerStarted ? "20:00 complete" : "20:00"}</Text>
          <Text style={styles.timerCopy}>
            {timerStarted
              ? "Nice focus. Add a note if you want, then send it for review."
              : "The timer stays on this device and never awards stars by itself."}
          </Text>
          <Button
            onPress={() => setTimerStarted(true)}
            tone={timerStarted ? "secondary" : "primary"}
          >
            {timerStarted ? "Timer complete ✓" : "Start 20-minute timer"}
          </Button>
        </Card>
      ) : null}

      <FormField
        label="Add a note (optional)"
        multiline
        onChangeText={setNote}
        placeholder="Tell your grown-up how it went."
        value={note}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {goal.status === "submitted" ? (
        <View style={styles.pending}>
          <Text style={styles.pendingTitle}>Waiting for a grown-up</Text>
          <Text style={styles.pendingCopy}>
            Your work is saved. Stars will arrive after it’s reviewed.
          </Text>
        </View>
      ) : (
        <Button loading={busy} onPress={() => void submit()}>
          I did it — send for review
        </Button>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 35,
  },
  error: {
    color: "#A42C4E",
    fontSize: 13,
    marginBottom: spacing.md,
  },
  hero: {
    alignItems: "center",
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  icon: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  instructions: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  pending: {
    backgroundColor: colors.lavender,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  pendingCopy: {
    color: colors.purpleDark,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  pendingTitle: {
    color: colors.purpleDark,
    fontSize: 16,
    fontWeight: "900",
  },
  points: {
    color: "#FFD463",
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  timer: {
    color: colors.ink,
    fontSize: 44,
    fontWeight: "900",
    marginTop: spacing.md,
    textAlign: "center",
  },
  timerCopy: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  title: {
    color: colors.surface,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.md,
    textAlign: "center",
  },
});
