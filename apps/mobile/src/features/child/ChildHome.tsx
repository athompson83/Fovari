import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { ChildSummary, GoalSummary, RewardSummary } from "@fovari/api-client";
import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { SectionHeader } from "../../components/SectionHeader";

interface ChildHomeProps {
  child: ChildSummary;
  goals: readonly GoalSummary[];
  onOpenGoal: (goalId: string) => void;
  onParentGate: () => void;
  reward?: RewardSummary;
}

export function ChildHome({ child, goals, onOpenGoal, onParentGate, reward }: ChildHomeProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const mode = getAgeModeTokens(child.experienceMode);
  const activeGoal = goals.find((goal) => goal.status === "ready") ?? goals[0];
  const rewardRemaining = reward ? Math.max(0, reward.pointCost - child.points) : 0;

  return (
    <View>
      <View style={[styles.hero, { backgroundColor: mode.accent }]}>
        <View style={styles.heroTop}>
          <Avatar color={mode.surface} name={child.name} size={64} />
          <View style={styles.heroIdentity}>
            <Text style={styles.heroTitle}>Hi, {child.name}!</Text>
            <Text style={styles.heroSubtitle}>Let’s make one good thing happen today.</Text>
          </View>
          <View style={styles.starsBadge}>
            <Text style={styles.starsValue}>★ {child.points}</Text>
            <Text style={styles.starsLabel}>{child.points} stars</Text>
          </View>
        </View>
        <View style={styles.streakRow}>
          <Text style={styles.streakCopy}>🔥 {child.streakDays} day streak</Text>
          <Text style={styles.levelCopy}>
            Level {child.level} {mode.label}
          </Text>
        </View>
      </View>

      <View style={[styles.grid, wide && styles.gridWide]}>
        <Card style={[styles.nextCard, wide && styles.primaryWide]}>
          <Text style={styles.eyebrow}>YOUR NEXT WIN</Text>
          {activeGoal ? (
            <>
              <View style={[styles.taskIcon, { backgroundColor: mode.surface }]}>
                <Text style={styles.taskEmoji}>
                  {activeGoal.category === "reading"
                    ? "📚"
                    : activeGoal.category === "school"
                      ? "✏️"
                      : "⚡"}
                </Text>
              </View>
              <Text style={styles.taskTitle}>{activeGoal.title}</Text>
              <Text style={styles.taskInstructions}>{activeGoal.instructions}</Text>
              <View style={styles.taskMeta}>
                <Text style={styles.metaText}>◷ {activeGoal.dueLabel}</Text>
                <Text style={styles.pointValue}>+{activeGoal.pointValue} ★</Text>
              </View>
              <Button
                accessibilityLabel={`Start ${activeGoal.title}`}
                onPress={() => onOpenGoal(activeGoal.id)}
              >
                {activeGoal.verification === "timer" ? "Start focus timer" : "Open goal"}
              </Button>
            </>
          ) : (
            <View style={styles.allDone}>
              <Text style={styles.taskEmoji}>🎉</Text>
              <Text style={styles.taskTitle}>You’re all caught up!</Text>
              <Text style={styles.taskInstructions}>
                Enjoy your win. New goals will show up here when they’re ready.
              </Text>
            </View>
          )}
        </Card>

        <View style={[styles.sideColumn, wide && styles.sideWide]}>
          <Card style={styles.progressCard}>
            <SectionHeader title="Today’s progress" />
            <View style={styles.progressRing}>
              <Text style={styles.progressValue}>
                {child.completedToday}/{child.totalToday}
              </Text>
              <Text style={styles.progressLabel}>goals</Text>
            </View>
            <ProgressBar
              accessibilityLabel="Today's goal progress"
              color={mode.accent}
              progress={child.totalToday ? child.completedToday / child.totalToday : 0}
            />
            <Text style={styles.encouragement}>
              {child.completedToday === child.totalToday
                ? "You did it. Every goal is complete!"
                : `${Math.max(0, child.totalToday - child.completedToday)} more ${
                    child.totalToday - child.completedToday === 1 ? "goal" : "goals"
                  } today`}
            </Text>
          </Card>

          <Card style={styles.rewardCard}>
            <SectionHeader title="Your big reward" />
            <View style={styles.rewardVisual}>
              <Text style={styles.rewardEmoji}>{reward?.emoji ?? "🎁"}</Text>
              <View style={styles.rewardCopy}>
                <Text style={styles.rewardTitle}>{reward?.title ?? "Choose a reward"}</Text>
                <Text style={styles.rewardRemaining}>
                  {reward
                    ? rewardRemaining === 0
                      ? "You can request it!"
                      : `${rewardRemaining} stars to go`
                    : "Pick something worth working toward"}
                </Text>
              </View>
            </View>
            {reward ? (
              <ProgressBar
                accessibilityLabel={`Progress toward ${reward.title}`}
                color={colors.yellow}
                progress={Math.min(1, child.points / reward.pointCost)}
              />
            ) : null}
          </Card>
        </View>
      </View>

      <SectionHeader title="Also on your list" />
      <View style={styles.goalList}>
        {goals.slice(1, 4).map((goal) => (
          <Pressable
            accessibilityLabel={`Open ${goal.title}`}
            accessibilityRole="button"
            key={goal.id}
            onPress={() => onOpenGoal(goal.id)}
            style={({ pressed }) => [
              styles.goalRow,
              { borderLeftColor: mode.accent },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.goalCopy}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDue}>{goal.dueLabel}</Text>
            </View>
            <Text style={styles.goalPoints}>+{goal.pointValue} ★</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.parentGateRow}>
        <Text style={styles.parentGateCopy}>
          Finished with your profile? A grown-up can switch the app safely.
        </Text>
        <Button
          accessibilityLabel="Open parent gate"
          onPress={onParentGate}
          style={styles.parentGateButton}
          tone="quiet"
        >
          Parent gate
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  allDone: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  encouragement: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  goalCopy: {
    flex: 1,
  },
  goalDue: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  goalList: {
    gap: spacing.sm,
  },
  goalPoints: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: "900",
  },
  goalRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radii.md,
    flexDirection: "row",
    minHeight: 72,
    padding: spacing.lg,
  },
  goalTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  grid: {
    marginBottom: spacing.xl,
  },
  gridWide: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  heroIdentity: {
    flex: 1,
    marginLeft: spacing.md,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    marginTop: 2,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 25,
    fontWeight: "900",
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  levelCopy: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
  },
  metaText: {
    color: colors.inkMuted,
    flex: 1,
    fontSize: 12,
  },
  nextCard: {
    marginBottom: spacing.lg,
  },
  parentGateButton: {
    minWidth: 132,
  },
  parentGateCopy: {
    color: colors.inkMuted,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  parentGateRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryWide: {
    flex: 1.35,
    marginBottom: 0,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  progressLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  progressRing: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.lavender,
    borderRadius: radii.pill,
    borderWidth: 9,
    height: 112,
    justifyContent: "center",
    marginBottom: spacing.lg,
    marginHorizontal: "auto",
    width: 112,
  },
  progressValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
  },
  rewardCard: {
    flex: 1,
  },
  rewardCopy: {
    flex: 1,
  },
  rewardEmoji: {
    fontSize: 38,
    marginRight: spacing.md,
  },
  rewardRemaining: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  rewardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  rewardVisual: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  sideColumn: {},
  sideWide: {
    flex: 0.85,
  },
  starsBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  starsLabel: {
    color: colors.surface,
    fontSize: 10,
  },
  starsValue: {
    color: "#FFD463",
    fontSize: 16,
    fontWeight: "900",
  },
  streakCopy: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  streakRow: {
    borderTopColor: "rgba(255,255,255,0.18)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  taskEmoji: {
    fontSize: 32,
  },
  taskIcon: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 70,
    justifyContent: "center",
    marginTop: spacing.lg,
    width: 70,
  },
  taskInstructions: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  taskMeta: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  taskTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: spacing.lg,
  },
  pointValue: {
    color: colors.purple,
    fontSize: 16,
    fontWeight: "900",
  },
});
