import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

export default function ParentInsightsRoute() {
  const snapshot = useFamilySnapshot();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  if (!snapshot) return <LoadingState />;

  const totalCompleted = snapshot.children.reduce((sum, child) => sum + child.completedToday, 0);
  const totalGoals = snapshot.children.reduce((sum, child) => sum + child.totalToday, 0);
  const totalStars = snapshot.children.reduce((sum, child) => sum + child.points, 0);
  const approved = snapshot.completions.filter((item) => item.status === "approved").length;

  return (
    <Screen>
      <PageHeader
        subtitle="Celebrate patterns without comparing children."
        title="Family insights"
      />
      <View style={[styles.statGrid, wide && styles.statGridWide]}>
        {[
          ["✓", `${totalCompleted}/${totalGoals}`, "Goals today", colors.blue],
          ["★", String(totalStars), "Stars saved", colors.yellow],
          ["🔥", "15", "Family streak", colors.coral],
          ["🏅", String(snapshot.achievements.length + approved), "Victories", colors.green],
        ].map(([icon, value, label, color]) => (
          <Card key={label} style={[styles.statCard, wide && styles.statCardWide]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
              <Text style={styles.statEmoji}>{icon}</Text>
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <View style={[styles.lowerGrid, wide && styles.lowerGridWide]}>
        <Card style={styles.panel}>
          <SectionHeader subtitle="A gentle look at current routines" title="Goal momentum" />
          {snapshot.children.map((child) => (
            <View key={child.id} style={styles.childProgress}>
              <View style={styles.childRow}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childValue}>
                  {child.completedToday}/{child.totalToday}
                </Text>
              </View>
              <ProgressBar
                accessibilityLabel={`${child.name}'s completion rate`}
                color={child.name === "Alex" ? colors.blue : colors.green}
                progress={child.totalToday ? child.completedToday / child.totalToday : 0}
              />
            </View>
          ))}
          <View style={styles.insight}>
            <Text style={styles.insightTitle}>A pattern worth noticing</Text>
            <Text style={styles.insightCopy}>
              Reading is Alex’s most consistent routine this week. A specific compliment may be more
              motivating than extra points.
            </Text>
          </View>
        </Card>

        <Card style={styles.panel}>
          <SectionHeader
            subtitle="Permanent wins, separate from spendable stars"
            title="Victories"
          />
          {snapshot.achievements.map((achievement) => (
            <View key={achievement.id} style={styles.victoryRow}>
              <Text style={styles.victoryEmoji}>{achievement.emoji}</Text>
              <View style={styles.victoryCopy}>
                <Text style={styles.victoryTitle}>{achievement.title}</Text>
                <Text style={styles.victoryDescription}>{achievement.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  childName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  childProgress: {
    marginBottom: spacing.lg,
  },
  childRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  childValue: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: "900",
  },
  insight: {
    backgroundColor: colors.lavender,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },
  insightCopy: {
    color: colors.purpleDark,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  insightTitle: {
    color: colors.purpleDark,
    fontSize: 14,
    fontWeight: "900",
  },
  lowerGrid: {
    gap: spacing.lg,
  },
  lowerGridWide: {
    flexDirection: "row",
  },
  panel: {
    flex: 1,
  },
  statCard: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  statCardWide: {
    flex: 1,
    marginBottom: 0,
  },
  statEmoji: {
    fontSize: 22,
  },
  statGrid: {
    marginBottom: spacing.xl,
  },
  statGridWide: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statValue: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  victoryCopy: {
    flex: 1,
  },
  victoryDescription: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  victoryEmoji: {
    fontSize: 30,
    marginRight: spacing.md,
  },
  victoryRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  victoryTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
});
