import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

const days = [
  ["S", "19"],
  ["M", "20"],
  ["T", "21"],
  ["W", "22"],
  ["T", "23"],
  ["F", "24"],
  ["S", "25"],
] as const;

export default function ParentCalendarRoute() {
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;

  return (
    <Screen>
      <PageHeader subtitle="One calm view of everyone’s day" title="Calendar" />
      <Card style={styles.weekCard}>
        <View style={styles.monthRow}>
          <Text style={styles.month}>July 2026</Text>
          <Text style={styles.weekLabel}>This week</Text>
        </View>
        <View style={styles.days}>
          {days.map(([label, date]) => {
            const active = date === "24";
            return (
              <View key={date} style={[styles.day, active && styles.activeDay]}>
                <Text style={[styles.dayLabel, active && styles.activeText]}>{label}</Text>
                <Text style={[styles.dayDate, active && styles.activeText]}>{date}</Text>
                {active ? <View style={styles.dot} /> : null}
              </View>
            );
          })}
        </View>
      </Card>

      <SectionHeader subtitle="Thursday, July 24" title="Today" />
      <Card>
        {snapshot.calendar.map((item) => {
          const child = snapshot.children.find((profile) => profile.id === item.childId);
          return (
            <View key={item.id} style={styles.eventRow}>
              <Text style={styles.time}>{item.timeLabel}</Text>
              <View style={[styles.eventLine, { backgroundColor: item.color }]} />
              <View style={styles.eventIcon}>
                <Text style={styles.eventEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventChild}>{child?.name ?? "Whole family"}</Text>
              </View>
            </View>
          );
        })}
      </Card>
      <Card style={styles.note}>
        <Text style={styles.noteTitle}>A lighter day is still a good day.</Text>
        <Text style={styles.noteBody}>
          Fovari keeps routines visible without punishing a family when plans change.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeDay: {
    backgroundColor: colors.purple,
  },
  activeText: {
    color: colors.surface,
  },
  day: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    minHeight: 68,
    paddingVertical: spacing.sm,
  },
  dayDate: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },
  dayLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  days: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dot: {
    backgroundColor: colors.yellow,
    borderRadius: 3,
    height: 5,
    marginTop: 5,
    width: 5,
  },
  eventChild: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  eventCopy: {
    flex: 1,
  },
  eventEmoji: {
    fontSize: 20,
  },
  eventIcon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    marginRight: spacing.md,
    width: 46,
  },
  eventLine: {
    alignSelf: "stretch",
    borderRadius: 2,
    marginHorizontal: spacing.md,
    width: 4,
  },
  eventRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 82,
    paddingVertical: spacing.sm,
  },
  eventTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  month: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  monthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  note: {
    backgroundColor: colors.lavender,
    marginTop: spacing.lg,
  },
  noteBody: {
    color: colors.purpleDark,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  noteTitle: {
    color: colors.purpleDark,
    fontSize: 15,
    fontWeight: "900",
  },
  time: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    width: 62,
  },
  weekCard: {
    marginBottom: spacing.xl,
  },
  weekLabel: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: "800",
  },
});
