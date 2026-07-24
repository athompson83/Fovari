import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../../src/components/Avatar";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

export default function ChildProfileRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;
  const child =
    snapshot.children.find((item) => item.id === snapshot.activeChildId) ?? snapshot.children[0];
  if (!child) return <LoadingState />;
  const mode = getAgeModeTokens(child.experienceMode);
  const achievements = snapshot.achievements.filter((item) => item.childId === child.id);

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: mode.accent }]}>
        <Avatar color={mode.surface} name={child.name} size={92} />
        <Text style={styles.name}>{child.name}</Text>
        <Text style={styles.level}>
          Level {child.level} · {mode.label}
        </Text>
        <View style={styles.levelProgress}>
          <ProgressBar accessibilityLabel="Level progress" color={colors.yellow} progress={0.6} />
          <Text style={styles.levelCopy}>600 / 1,000 XP to Level {child.level + 1}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {[
          ["🔥", child.streakDays, "day streak"],
          ["★", child.points, "stars"],
          ["🏅", achievements.length, "badges"],
        ].map(([icon, value, label]) => (
          <Card key={label} style={styles.stat}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader
        actionLabel="See all"
        onAction={() => router.push("/(child)/victory-vault")}
        title="Victory Vault"
      />
      <Card>
        {achievements.map((achievement) => (
          <Pressable
            accessibilityRole="button"
            key={achievement.id}
            onPress={() => router.push("/(child)/victory-vault")}
            style={styles.achievement}
          >
            <View style={[styles.badge, { backgroundColor: mode.surface }]}>
              <Text style={styles.badgeEmoji}>{achievement.emoji}</Text>
            </View>
            <View style={styles.achievementCopy}>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementBody}>{achievement.description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </Card>
      <Button
        accessibilityLabel="Open parent gate"
        onPress={() => router.push("/(child)/parent-gate")}
        style={styles.parentButton}
        tone="secondary"
      >
        Grown-up controls
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  achievement: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 76,
  },
  achievementBody: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  achievementCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  achievementTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  badge: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  badgeEmoji: {
    fontSize: 25,
  },
  chevron: {
    color: colors.purple,
    fontSize: 27,
  },
  hero: {
    alignItems: "center",
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  level: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginTop: 3,
  },
  levelCopy: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  levelProgress: {
    marginTop: spacing.lg,
    maxWidth: 320,
    width: "100%",
  },
  name: {
    color: colors.surface,
    fontSize: 27,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  parentButton: {
    marginTop: spacing.xl,
  },
  stat: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  statIcon: {
    fontSize: 21,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    marginTop: 2,
  },
  statValue: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
});
