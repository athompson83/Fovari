import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../src/components/Avatar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingState } from "../../src/components/LoadingState";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import {
  createLocalCommandId,
  useFamilyAction,
  useFamilySnapshot,
} from "../../src/hooks/use-family";

export default function ApprovalsRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  if (!snapshot) return <LoadingState />;

  const pending = snapshot.completions.filter((item) => item.status === "submitted");
  const approve = async (completionId: string) => {
    const idempotencyKey = createLocalCommandId("approval");
    await run(() =>
      repository.approveCompletion(
        { completionId },
        {
          actorId: snapshot.activeActor.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
  };

  return (
    <Screen>
      <PageHeader
        actionLabel="Back to family"
        onAction={() => router.back()}
        subtitle="Each approval creates one permanent ledger entry."
        title="Approvals"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pending.length ? (
        pending.map((completion) => {
          const child = snapshot.children.find((item) => item.id === completion.childId);
          const goal = snapshot.goals.find((item) => item.id === completion.goalId);
          const balanceAfter = (child?.points ?? 0) + (goal?.pointValue ?? 0);
          return (
            <Card key={completion.id} style={styles.card}>
              <View style={styles.top}>
                <Avatar name={child?.name ?? "Child"} />
                <View style={styles.copy}>
                  <Text style={styles.child}>{child?.name} says it’s done</Text>
                  <Text style={styles.title}>{goal?.title}</Text>
                  <Text style={styles.time}>Submitted today · awaiting adult review</Text>
                </View>
              </View>
              {completion.childNote ? (
                <View style={styles.note}>
                  <Text style={styles.noteLabel}>CHILD NOTE</Text>
                  <Text style={styles.noteText}>“{completion.childNote}”</Text>
                </View>
              ) : null}
              <View style={styles.impact}>
                <View>
                  <Text style={styles.impactLabel}>REWARD</Text>
                  <Text style={styles.impactValue}>+{goal?.pointValue ?? 0} stars</Text>
                </View>
                <View>
                  <Text style={styles.impactLabel}>NEW BALANCE</Text>
                  <Text style={styles.impactValue}>{balanceAfter} stars</Text>
                </View>
              </View>
              <Button
                accessibilityLabel={`Approve ${goal?.title ?? "goal"}`}
                loading={busy}
                onPress={() => void approve(completion.id)}
              >
                Approve & celebrate
              </Button>
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState
            actionLabel="Return to family"
            description="New completion requests will appear here with their exact point impact."
            emoji="✨"
            onAction={() => router.back()}
            title="Everything is reviewed"
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  child: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  copy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  error: {
    backgroundColor: "#FFE7EF",
    borderRadius: radii.md,
    color: "#A42C4E",
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  impact: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  impactLabel: {
    color: colors.inkMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  impactValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  note: {
    backgroundColor: colors.lavender,
    borderRadius: radii.md,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  noteLabel: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  noteText: {
    color: colors.purpleDark,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  time: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
  },
});
