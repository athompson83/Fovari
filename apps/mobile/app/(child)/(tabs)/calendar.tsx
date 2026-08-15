import { StyleSheet, Text, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { resolveAuthenticatedChild } from "../../../src/features/identity/authenticated-child";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

export default function ChildCalendarRoute() {
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;
  const child = resolveAuthenticatedChild(snapshot);
  if (!child) return <LoadingState />;
  const mode = getAgeModeTokens(child.experienceMode);
  const items = snapshot.calendar.filter((item) => !item.childId || item.childId === child.id);

  return (
    <Screen>
      <PageHeader subtitle="A simple look at what’s next" title="My day" />
      <View style={[styles.dateHero, { backgroundColor: mode.accent }]}>
        <Text style={styles.weekday}>THURSDAY</Text>
        <Text style={styles.date}>July 24</Text>
        <Text style={styles.weather}>☀️ A good day for one thing at a time</Text>
      </View>
      <Card>
        {items.map((item, index) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              {index < items.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <Text style={styles.time}>{item.timeLabel}</Text>
            <View style={styles.event}>
              <Text style={styles.emoji}>{item.icon}</Text>
              <View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.copy}>{item.childId ? "Your plan" : "Whole family"}</Text>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 3,
  },
  date: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  dateHero: {
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  emoji: {
    fontSize: 25,
    marginRight: spacing.md,
  },
  event: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: "row",
    minHeight: 64,
    padding: spacing.md,
  },
  line: {
    backgroundColor: colors.line,
    flex: 1,
    marginVertical: 3,
    width: 2,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    minHeight: 82,
  },
  time: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    marginRight: spacing.sm,
    marginTop: 18,
    width: 58,
  },
  timeline: {
    alignItems: "center",
    alignSelf: "stretch",
    marginRight: spacing.sm,
    paddingTop: 20,
    width: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  weather: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: spacing.md,
  },
  weekday: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
});
