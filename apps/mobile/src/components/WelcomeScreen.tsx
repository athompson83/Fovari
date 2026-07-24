import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, radii, spacing, typography } from "@fovari/design-system";

import { Button } from "./Button";
import { Card } from "./Card";
import { FovariLogo } from "./FovariLogo";
import { Screen } from "./Screen";

export interface WelcomeScreenProps {
  onCreateAccount(): void;
  onDemo(): void;
  onOpenLink(label: "Privacy" | "Support" | "Terms"): void;
}

const benefits = [
  ["✓", "Clear routines", "Kids always know what comes next."],
  ["★", "Meaningful rewards", "Parents stay in control of every choice."],
  ["↗", "Progress that lasts", "Celebrate effort, habits, and independence."],
] as const;

const modes = [
  { accent: "#2F9D55", age: "4–7", emoji: "🦕", label: "Explorer" },
  { accent: "#246BFD", age: "8–11", emoji: "🦝", label: "Adventurer" },
  { accent: "#6C5CE7", age: "12–14", emoji: "🦊", label: "Independence" },
  { accent: "#24335F", age: "15–17", emoji: "🚀", label: "Launch" },
] as const;

export function WelcomeScreen({ onCreateAccount, onDemo, onOpenLink }: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;

  return (
    <Screen contentContainerStyle={styles.screenContent} testID="welcome-screen">
      <View style={[styles.hero, wide && styles.heroWide]}>
        <View style={[styles.heroCopy, wide && styles.heroCopyWide]}>
          <FovariLogo />
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>A PRIVATE FAMILY REWARDS APP</Text>
          </View>
          <Text style={[styles.headline, wide && styles.headlineWide]}>
            Grow together.{"\n"}
            <Text style={styles.headlineAccent}>Celebrate every win.</Text>
          </Text>
          <Text style={styles.subhead}>
            Build healthy routines, recognize real effort, and let kids work toward rewards that
            matter—without turning family life into a scoreboard.
          </Text>
          <View style={styles.actions}>
            <Button
              accessibilityLabel="Explore the family demo"
              onPress={onDemo}
              style={styles.primaryAction}
            >
              Explore the family demo
            </Button>
            <Button onPress={onCreateAccount} tone="secondary">
              Create family account
            </Button>
          </View>
          <Text style={styles.localNote}>
            Local demo · Synthetic family data · No account needed
          </Text>
        </View>

        <View style={[styles.preview, wide && styles.previewWide]}>
          <View style={styles.sparkOne}>
            <Text style={styles.sparkText}>✦</Text>
          </View>
          <View style={styles.sparkTwo}>
            <Text style={styles.sparkText}>★</Text>
          </View>
          <Card style={styles.phoneCard}>
            <View style={styles.phoneTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>A</Text>
              </View>
              <View style={styles.greeting}>
                <Text style={styles.greetingTitle}>Hi, Alex! 👋</Text>
                <Text style={styles.greetingText}>Let&apos;s make today count.</Text>
              </View>
              <View style={styles.streak}>
                <Text style={styles.streakValue}>🔥 12</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>
            <View style={styles.nextCard}>
              <Text style={styles.nextKicker}>YOUR NEXT GOAL</Text>
              <Text style={styles.nextTitle}>Read for 20 minutes</Text>
              <Text style={styles.nextMeta}>Due today, 7:00 PM · +15 stars</Text>
              <View style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Start reading</Text>
              </View>
            </View>
            <View style={styles.rewardCard}>
              <View>
                <Text style={styles.rewardKicker}>SAVING FOR</Text>
                <Text style={styles.rewardTitle}>New headphones 🎧</Text>
                <Text style={styles.rewardMeta}>240 of 320 stars</Text>
              </View>
              <Text style={styles.rewardPercent}>75%</Text>
            </View>
          </Card>
        </View>
      </View>

      <View style={styles.benefitGrid}>
        {benefits.map(([icon, title, description]) => (
          <View key={title} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Text style={styles.benefitIconText}>{icon}</Text>
            </View>
            <View style={styles.benefitCopy}>
              <Text style={styles.benefitTitle}>{title}</Text>
              <Text style={styles.benefitDescription}>{description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.modeSection}>
        <Text style={styles.sectionEyebrow}>ONE FAMILY, FOUR GROWING EXPERIENCES</Text>
        <Text style={styles.sectionTitle}>Designed to grow up with them.</Text>
        <View style={styles.modeGrid}>
          {modes.map((mode) => (
            <Card key={mode.label} style={styles.modeCard}>
              <View style={[styles.modeArt, { backgroundColor: `${mode.accent}18` }]}>
                <Text style={styles.modeEmoji}>{mode.emoji}</Text>
              </View>
              <Text style={[styles.modeAge, { color: mode.accent }]}>{mode.age}</Text>
              <Text style={styles.modeLabel}>{mode.label}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.trustBar}>
        <Text style={styles.trustStatement}>Built for families. Designed for kids.</Text>
        <View style={styles.legalLinks}>
          {(["Privacy", "Terms", "Support"] as const).map((label) => (
            <Pressable accessibilityRole="link" key={label} onPress={() => onOpenLink(label)}>
              <Text style={styles.legalLink}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.yellow,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900",
  },
  benefit: {
    alignItems: "center",
    flexDirection: "row",
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.md,
    minWidth: 240,
  },
  benefitCopy: {
    flex: 1,
  },
  benefitDescription: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  benefitGrid: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xl,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  benefitIcon: {
    alignItems: "center",
    backgroundColor: colors.lavender,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  benefitIconText: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: "900",
  },
  benefitTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.purpleDark,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  eyebrowDot: {
    backgroundColor: colors.green,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  eyebrowRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  greetingTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  headline: {
    color: colors.navy,
    fontSize: typography.display,
    fontWeight: "900",
    letterSpacing: -1.4,
    lineHeight: 41,
    marginTop: spacing.md,
  },
  headlineAccent: {
    color: colors.purple,
  },
  headlineWide: {
    fontSize: 52,
    lineHeight: 57,
  },
  hero: {
    backgroundColor: "#F0EDFF",
    borderColor: "#DED8FF",
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.xl,
  },
  heroCopy: {
    maxWidth: 620,
  },
  heroCopyWide: {
    flex: 1.05,
    padding: spacing.xl,
  },
  heroWide: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 610,
    padding: spacing.xxl,
  },
  legalLink: {
    color: "#DCD9FF",
    fontSize: 13,
    fontWeight: "700",
  },
  legalLinks: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  localNote: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: spacing.md,
  },
  modeAge: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  modeArt: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 90,
    justifyContent: "center",
  },
  modeCard: {
    flexBasis: 170,
    flexGrow: 1,
    minWidth: 145,
  },
  modeEmoji: {
    fontSize: 42,
  },
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modeLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  modeSection: {
    marginVertical: 52,
  },
  nextButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  nextButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  nextCard: {
    backgroundColor: "#F6F8FF",
    borderColor: "#E1E6FF",
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  nextKicker: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  nextMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  nextTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  phoneCard: {
    padding: spacing.xl,
    width: "100%",
  },
  phoneTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  preview: {
    marginTop: spacing.xxl,
    maxWidth: 430,
    position: "relative",
  },
  previewWide: {
    flex: 0.95,
    marginLeft: spacing.xxl,
    marginTop: 0,
  },
  primaryAction: {
    minWidth: 220,
  },
  rewardCard: {
    alignItems: "center",
    backgroundColor: "#FFF8E8",
    borderRadius: radii.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  rewardKicker: {
    color: "#A66A00",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  rewardMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  rewardPercent: {
    color: "#A66A00",
    fontSize: 20,
    fontWeight: "900",
  },
  rewardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  screenContent: {
    backgroundColor: colors.background,
  },
  sectionEyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  sparkOne: {
    alignItems: "center",
    backgroundColor: "#FFD966",
    borderRadius: radii.pill,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: -12,
    top: -18,
    width: 42,
    zIndex: 2,
  },
  sparkText: {
    color: colors.purpleDark,
    fontSize: 18,
  },
  sparkTwo: {
    alignItems: "center",
    backgroundColor: "#D8F4EC",
    borderRadius: radii.pill,
    bottom: -14,
    height: 38,
    justifyContent: "center",
    left: -16,
    position: "absolute",
    width: 38,
    zIndex: 2,
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
    fontSize: 12,
    fontWeight: "900",
  },
  subhead: {
    color: colors.inkMuted,
    fontSize: 17,
    lineHeight: 26,
    marginTop: spacing.lg,
    maxWidth: 560,
  },
  trustBar: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  trustStatement: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
});
