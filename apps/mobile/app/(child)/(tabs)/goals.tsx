import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { resolveAuthenticatedChild } from "../../../src/features/identity/authenticated-child";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

export default function ChildGoalsRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;
  const child = resolveAuthenticatedChild(snapshot);
  if (!child) return <LoadingState />;
  const mode = getAgeModeTokens(child.experienceMode);
  const goals = snapshot.goals.filter((goal) => goal.childId === child.id);

  return (
    <Screen>
      <PageHeader
        eyebrow={`${mode.label} mode`}
        subtitle="Pick one thing and make it your next win."
        title="My goals"
      />
      <View style={[styles.summary, { backgroundColor: mode.accent }]}>
        <View>
          <Text style={styles.summaryEyebrow}>TODAY</Text>
          <Text style={styles.summaryTitle}>
            {child.completedToday} of {child.totalToday} complete
          </Text>
        </View>
        <Text style={styles.summaryStreak}>🔥 {child.streakDays}</Text>
      </View>

      <SectionHeader title="Ready to do" />
      {goals.map((goal) => (
        <Pressable
          accessibilityLabel={`Open ${goal.title}`}
          accessibilityRole="button"
          key={goal.id}
          onPress={() =>
            router.push({
              pathname: "/(child)/goal/[occurrenceId]",
              params: { occurrenceId: goal.id },
            })
          }
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        >
          <Card style={styles.goalCard}>
            <View style={[styles.icon, { backgroundColor: mode.surface }]}>
              <Text style={styles.iconText}>
                {goal.category === "reading"
                  ? "📚"
                  : goal.category === "school"
                    ? "✏️"
                    : goal.category === "exercise"
                      ? "🏃"
                      : "✓"}
              </Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{goal.title}</Text>
              <Text style={styles.due}>{goal.dueLabel}</Text>
              {goal.status === "submitted" ? (
                <Text style={styles.pending}>Waiting for a grown-up</Text>
              ) : null}
            </View>
            <Text style={styles.points}>+{goal.pointValue} ★</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  due: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  goalCard: {
    alignItems: "center",
    flexDirection: "row",
  },
  icon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  iconText: {
    fontSize: 24,
  },
  pending: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  points: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: "900",
  },
  pressable: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  summary: {
    alignItems: "center",
    borderRadius: radii.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  summaryEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  summaryStreak: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900",
  },
  summaryTitle: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
});
