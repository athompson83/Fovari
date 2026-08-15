import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Card } from "../../../src/components/Card";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";

const actions = [
  {
    color: "#EAF5FF",
    description: "Create a routine, one-time task, habit, or longer-term goal.",
    emoji: "✓",
    path: "/(parent)/goal/new",
    title: "New goal",
  },
  {
    color: "#FFF2CC",
    description: "Add an experience, privilege, item, or savings target.",
    emoji: "★",
    path: "/(parent)/reward/new",
    title: "New reward",
  },
  {
    color: "#DDF8F0",
    description: "Record a thoughtful adjustment with a visible ledger reason.",
    emoji: "＋",
    path: "/(parent)/ledger",
    title: "Point adjustment",
  },
] as const;

export default function ParentAddRoute() {
  const router = useRouter();

  return (
    <Screen>
      <PageHeader
        subtitle="Set the next expectation—or the next thing worth celebrating."
        title="Add"
      />
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>QUICK START</Text>
        <Text style={styles.heroTitle}>What would help your family today?</Text>
        <Text style={styles.heroBody}>
          Keep it specific, achievable, and connected to something your child understands.
        </Text>
      </View>
      <SectionHeader title="Choose an action" />
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.title}
            accessibilityRole="button"
            key={action.title}
            onPress={() => router.push(action.path)}
            style={({ pressed }) => [styles.actionPressable, pressed && styles.pressed]}
          >
            <Card style={styles.actionCard}>
              <View style={[styles.icon, { backgroundColor: action.color }]}>
                <Text style={styles.iconText}>{action.emoji}</Text>
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))}
      </View>
      <Card style={styles.tip}>
        <Text style={styles.tipTitle}>A useful goal starts with a clear finish line.</Text>
        <Text style={styles.tipBody}>
          “Read for 20 minutes” is easier to understand and celebrate than “read more.”
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    flexDirection: "row",
  },
  actionCopy: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  actionDescription: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  actionPressable: {
    marginBottom: spacing.md,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  chevron: {
    color: colors.purple,
    fontSize: 30,
  },
  grid: {},
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  heroBody: {
    color: "#C9D0F5",
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 580,
  },
  heroEyebrow: {
    color: colors.yellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  icon: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  iconText: {
    color: colors.purpleDark,
    fontSize: 26,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.8,
  },
  tip: {
    backgroundColor: colors.lavender,
    marginTop: spacing.md,
  },
  tipBody: {
    color: colors.purpleDark,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  tipTitle: {
    color: colors.purpleDark,
    fontSize: 14,
    fontWeight: "900",
  },
});
