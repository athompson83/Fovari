import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { Card } from "../../src/components/Card";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { SectionHeader } from "../../src/components/SectionHeader";

const controls = [
  {
    enabled: true,
    title: "Private family space",
    description: "Profiles and activity are visible only inside this synthetic family.",
  },
  {
    enabled: true,
    title: "Parent approval for stars",
    description: "Child submissions never change balances until an authorized adult approves.",
  },
  {
    enabled: false,
    title: "External integrations",
    description: "Calendar, education, health, commerce, and AI adapters remain disabled locally.",
  },
] as const;

export default function PrivacyRoute() {
  const router = useRouter();
  return (
    <Screen>
      <PageHeader
        actionLabel="Done"
        onAction={() => router.back()}
        subtitle="Safe defaults and clear adult controls"
        title="Privacy & family settings"
      />
      <Card style={styles.hero}>
        <Text style={styles.heroIcon}>🛡️</Text>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>This local build uses synthetic data only.</Text>
          <Text style={styles.heroBody}>
            It does not contact a production service, send messages, process payments, or expose
            child profiles publicly.
          </Text>
        </View>
      </Card>
      <SectionHeader title="Safety controls" />
      <Card>
        {controls.map((control) => (
          <View key={control.title} style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>{control.title}</Text>
              <Text style={styles.description}>{control.description}</Text>
            </View>
            <Switch
              accessibilityLabel={control.title}
              disabled
              thumbColor={colors.surface}
              trackColor={{ false: colors.line, true: colors.purple }}
              value={control.enabled}
            />
          </View>
        ))}
      </Card>
      <SectionHeader title="Family data" />
      <Card>
        {["Export family data", "Review device sessions", "Request family deletion"].map((item) => (
          <View key={item} style={styles.linkRow}>
            <Text style={styles.linkText}>{item}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.purple,
    fontSize: 26,
  },
  copy: {
    flex: 1,
    marginRight: spacing.lg,
  },
  description: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.lavender,
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  heroBody: {
    color: colors.purpleDark,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  heroCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  heroIcon: {
    fontSize: 34,
  },
  heroTitle: {
    color: colors.purpleDark,
    fontSize: 15,
    fontWeight: "900",
  },
  linkRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 58,
  },
  linkText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 82,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
});
