import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Card } from "../../src/components/Card";
import { LoadingState } from "../../src/components/LoadingState";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useFamilySnapshot } from "../../src/hooks/use-family";

export default function VictoryVaultRoute() {
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
      <PageHeader
        actionLabel="Back"
        onAction={() => router.back()}
        subtitle="Wins stay here even after stars are spent."
        title="Victory Vault"
      />
      <View style={[styles.hero, { backgroundColor: mode.accent }]}>
        <Text style={styles.heroEmoji}>🏆</Text>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{child.name}’s story of effort</Text>
          <Text style={styles.heroBody}>
            {achievements.length} special {achievements.length === 1 ? "victory" : "victories"}{" "}
            saved
          </Text>
        </View>
      </View>
      {achievements.map((achievement) => (
        <Card key={achievement.id} style={styles.card}>
          <View style={[styles.badge, { backgroundColor: mode.surface }]}>
            <Text style={styles.emoji}>{achievement.emoji}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{achievement.title}</Text>
            <Text style={styles.description}>{achievement.description}</Text>
            <Text style={styles.date}>Earned {achievement.earnedOn}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  card: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  date: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  description: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  emoji: {
    fontSize: 32,
  },
  hero: {
    alignItems: "center",
    borderRadius: radii.xl,
    flexDirection: "row",
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  heroBody: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  heroCopy: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  heroEmoji: {
    fontSize: 46,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 21,
    fontWeight: "900",
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
});
