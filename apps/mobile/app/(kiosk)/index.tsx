import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../src/components/Avatar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { LoadingState } from "../../src/components/LoadingState";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Screen } from "../../src/components/Screen";
import { useFamilyAction, useFamilySnapshot } from "../../src/hooks/use-family";

export default function KioskRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { repository, run } = useFamilyAction();
  const { width } = useWindowDimensions();
  if (!snapshot) return <LoadingState />;
  const active =
    snapshot.children.find((item) => item.id === snapshot.activeChildId) ?? snapshot.children[0]!;
  const mode = getAgeModeTokens(active.experienceMode);
  const wide = width >= 760;

  const select = async (childId: string) => {
    await run(() => repository.selectChild(childId));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FOVARI FAMILY HUB</Text>
          <Text style={styles.title}>{snapshot.familyName}</Text>
        </View>
        <Button onPress={() => router.push("/(child)/parent-gate")} tone="secondary">
          Grown-up controls
        </Button>
      </View>
      <View style={[styles.layout, wide && styles.layoutWide]}>
        <Card style={[styles.profiles, wide && styles.profilesWide]}>
          <Text style={styles.section}>Who’s checking in?</Text>
          {snapshot.children.map((child) => {
            const selected = child.id === active.id;
            return (
              <Pressable
                accessibilityLabel={`Select ${child.name}`}
                accessibilityRole="button"
                key={child.id}
                onPress={() => void select(child.id)}
                style={[styles.profile, selected && styles.profileSelected]}
              >
                <Avatar name={child.name} size={48} />
                <View style={styles.profileCopy}>
                  <Text style={styles.profileName}>{child.name}</Text>
                  <Text style={styles.profileMeta}>
                    🔥 {child.streakDays} · ★ {child.points}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
        <View style={styles.main}>
          <View style={[styles.activeHero, { backgroundColor: mode.accent }]}>
            <Text style={styles.heroEyebrow}>{mode.label.toUpperCase()} MODE</Text>
            <Text style={styles.heroTitle}>Ready when you are, {active.name}.</Text>
            <Text style={styles.heroCopy}>
              {active.completedToday} of {active.totalToday} goals complete today
            </Text>
            <ProgressBar
              accessibilityLabel={`${active.name}'s kiosk goal progress`}
              color={colors.yellow}
              progress={active.totalToday ? active.completedToday / active.totalToday : 0}
            />
          </View>
          <Card style={styles.schedule}>
            <Text style={styles.section}>Family schedule</Text>
            {snapshot.calendar.map((event) => (
              <View key={event.id} style={styles.event}>
                <Text style={styles.eventTime}>{event.timeLabel}</Text>
                <Text style={styles.eventEmoji}>{event.icon}</Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
              </View>
            ))}
          </Card>
          <Button
            onPress={() =>
              void run(() =>
                repository
                  .switchActor({ childId: active.id, id: active.id, role: "child" })
                  .then((next) => {
                    router.replace("/(child)/(tabs)/home");
                    return next;
                  }),
              )
            }
          >
            Open {active.name}’s space
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeHero: {
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  event: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 58,
  },
  eventEmoji: {
    fontSize: 20,
    marginHorizontal: spacing.md,
  },
  eventTime: {
    color: colors.inkMuted,
    fontSize: 11,
    width: 58,
  },
  eventTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  heroEyebrow: {
    color: colors.yellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  layout: {
    gap: spacing.lg,
  },
  layoutWide: {
    flexDirection: "row",
  },
  main: {
    flex: 1,
  },
  profile: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: spacing.md,
    minHeight: 72,
    padding: spacing.sm,
  },
  profileCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileMeta: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 3,
  },
  profileName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  profileSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.purple,
  },
  profiles: {},
  profilesWide: {
    width: 280,
  },
  schedule: {
    marginBottom: spacing.lg,
  },
  section: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
});
