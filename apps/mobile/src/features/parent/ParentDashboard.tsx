import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { FamilySnapshot } from "@fovari/api-client";
import { colors, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ProgressBar } from "../../components/ProgressBar";
import { SectionHeader } from "../../components/SectionHeader";

interface ParentDashboardProps {
  onAdd: () => void;
  onHandoff: (childId: string) => void;
  onOpenApprovals: () => void;
  snapshot: FamilySnapshot;
}

const childColors = [colors.lavender, "#DDF8F0", "#FFE7EF", "#FFF2CC"];

export function ParentDashboard({
  onAdd,
  onHandoff,
  onOpenApprovals,
  snapshot,
}: ParentDashboardProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 840;
  const submitted = snapshot.completions.filter((item) => item.status === "submitted");

  return (
    <View>
      <View style={[styles.hero, wide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>THURSDAY · FAMILY OVERVIEW</Text>
          <Text style={styles.heroTitle}>Good morning, Jamie 👋</Text>
          <Text style={styles.heroBody}>
            The Rivera family is building momentum. Here’s what deserves your attention today.
          </Text>
        </View>
        <Button accessibilityLabel="Add a goal or reward" onPress={onAdd} style={styles.addButton}>
          ＋ Add something
        </Button>
      </View>

      <Pressable
        accessibilityLabel="Review pending approvals"
        accessibilityRole="button"
        onPress={onOpenApprovals}
        style={({ pressed }) => [styles.approvalBanner, pressed && styles.pressed]}
      >
        <View style={styles.approvalIcon}>
          <Text style={styles.approvalEmoji}>✓</Text>
        </View>
        <View style={styles.approvalCopy}>
          <Text style={styles.approvalTitle}>
            {submitted.length === 1
              ? "1 awaiting your review"
              : `${submitted.length} awaiting your review`}
          </Text>
          <Text style={styles.approvalBody}>
            Celebrate finished goals and release earned stars.
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <SectionHeader
        subtitle="A quick look at effort, balance, and what comes next."
        title="Your crew"
      />
      <View style={[styles.childGrid, wide && styles.childGridWide]}>
        {snapshot.children.map((child, index) => {
          const childGoals = snapshot.goals.filter((goal) => goal.childId === child.id);
          const selectedRewardId = snapshot.selectedRewardByChild[child.id];
          const selectedReward = snapshot.rewards.find((reward) => reward.id === selectedRewardId);

          return (
            <Card key={child.id} style={[styles.childCard, wide && styles.childCardWide]}>
              <View style={styles.childTop}>
                <Avatar
                  color={childColors[index % childColors.length] ?? colors.lavender}
                  name={child.name}
                  size={58}
                />
                <View style={styles.childIdentity}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.modeLabel}>
                    Level {child.level} · {child.experienceMode}
                  </Text>
                </View>
                <View style={styles.streak}>
                  <Text style={styles.streakValue}>🔥 {child.streakDays}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>
              </View>

              <View style={styles.todayRow}>
                <Text style={styles.todayTitle}>Today’s goals</Text>
                <Text style={styles.todayValue}>
                  {child.completedToday}/{child.totalToday}
                </Text>
              </View>
              <ProgressBar
                accessibilityLabel={`${child.name}'s daily goal progress`}
                color={child.completedToday === child.totalToday ? colors.green : colors.blue}
                progress={child.totalToday ? child.completedToday / child.totalToday : 0}
              />

              <View style={styles.goalList}>
                {childGoals.slice(0, 2).map((goal) => (
                  <View key={goal.id} style={styles.goalRow}>
                    <Text style={styles.goalDot}>{goal.status === "submitted" ? "◷" : "○"}</Text>
                    <Text numberOfLines={1} style={styles.goalTitle}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalPoints}>+{goal.pointValue}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.rewardStrip}>
                <View>
                  <Text style={styles.rewardLabel}>SAVING FOR</Text>
                  <Text style={styles.rewardTitle}>
                    {selectedReward?.emoji} {selectedReward?.title ?? "Choose a reward"}
                  </Text>
                </View>
                <Text style={styles.pointBalance}>★ {child.points}</Text>
              </View>

              <Button
                accessibilityLabel={`Hand off to ${child.name}`}
                onPress={() => onHandoff(child.id)}
                tone="secondary"
              >
                Hand off to {child.name}
              </Button>
            </Card>
          );
        })}
      </View>

      <View style={[styles.lowerGrid, wide && styles.lowerGridWide]}>
        <Card style={[styles.lowerCard, wide && styles.lowerCardWide]}>
          <SectionHeader title="Coming up today" />
          {snapshot.calendar.map((item) => (
            <View key={item.id} style={styles.calendarRow}>
              <View style={[styles.calendarIcon, { backgroundColor: `${item.color}18` }]}>
                <Text>{item.icon}</Text>
              </View>
              <View style={styles.calendarCopy}>
                <Text style={styles.calendarTitle}>{item.title}</Text>
                <Text style={styles.calendarTime}>{item.timeLabel}</Text>
              </View>
            </View>
          ))}
        </Card>
        <Card style={[styles.lowerCard, wide && styles.lowerCardWide]}>
          <SectionHeader title="Recent victories" />
          {snapshot.achievements.map((achievement) => {
            const child = snapshot.children.find((item) => item.id === achievement.childId);
            return (
              <View key={achievement.id} style={styles.victoryRow}>
                <Text style={styles.victoryEmoji}>{achievement.emoji}</Text>
                <View style={styles.calendarCopy}>
                  <Text style={styles.calendarTitle}>{achievement.title}</Text>
                  <Text style={styles.calendarTime}>
                    {child?.name} · {achievement.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    minWidth: 190,
  },
  approvalBanner: {
    alignItems: "center",
    backgroundColor: "#FFF8E8",
    borderColor: "#F4DBA7",
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.xl,
    minHeight: 86,
    padding: spacing.lg,
  },
  approvalBody: {
    color: "#7A6338",
    fontSize: 13,
    marginTop: 3,
  },
  approvalCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  approvalEmoji: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900",
  },
  approvalIcon: {
    alignItems: "center",
    backgroundColor: colors.yellow,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  approvalTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  calendarCopy: {
    flex: 1,
  },
  calendarIcon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 42,
    justifyContent: "center",
    marginRight: spacing.md,
    width: 42,
  },
  calendarRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  calendarTime: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  calendarTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  chevron: {
    color: "#9C7F44",
    fontSize: 30,
  },
  childCard: {
    marginBottom: spacing.md,
  },
  childCardWide: {
    flexBasis: "48%",
    flexGrow: 1,
    maxWidth: "50%",
  },
  childGrid: {},
  childGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  childIdentity: {
    flex: 1,
    marginLeft: spacing.md,
  },
  childName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  childTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.25,
  },
  goalDot: {
    color: colors.blue,
    fontSize: 18,
    marginRight: spacing.sm,
  },
  goalList: {
    marginVertical: spacing.md,
  },
  goalPoints: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: "900",
  },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: spacing.sm,
  },
  goalTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
    padding: spacing.xl,
  },
  heroBody: {
    color: "#C9D0F5",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  heroWide: {
    alignItems: "center",
    flexDirection: "row",
  },
  lowerCard: {
    marginTop: spacing.lg,
  },
  lowerCardWide: {
    flex: 1,
    marginTop: 0,
  },
  lowerGrid: {
    marginTop: spacing.lg,
  },
  lowerGridWide: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  modeLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  pointBalance: {
    color: colors.purpleDark,
    fontSize: 17,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
  },
  rewardLabel: {
    color: colors.inkMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  rewardStrip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  rewardTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  streak: {
    alignItems: "flex-end",
  },
  streakLabel: {
    color: colors.inkMuted,
    fontSize: 9,
  },
  streakValue: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "900",
  },
  todayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  todayTitle: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  todayValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  victoryEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  victoryRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
});
