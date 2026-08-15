import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Card } from "../../src/components/Card";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";

const documents = {
  privacy: {
    body: [
      "This local preview uses only synthetic Rivera-family data and keeps it in memory.",
      "Fovari does not sell child data, show advertising, expose public profiles, or connect production analytics in this build.",
      "A reviewed production privacy policy, data-rights workflow, retention schedule, and company contact are required before release.",
    ],
    title: "Privacy preview",
  },
  support: {
    body: [
      "The local preview has no live support channel and should not contain real family data.",
      "For development issues, record the app route, expected behavior, exact local commit, and synthetic reproduction steps without credentials or personal information.",
      "A staffed support contact, incident escalation path, and child-safety process are required before release.",
    ],
    title: "Support preview",
  },
  terms: {
    body: [
      "This software is a local engineering preview, not a public service or a substitute for family, medical, educational, or financial advice.",
      "Rewards are parent-defined family agreements. The preview cannot process purchases, messages, payments, or external provider data.",
      "Final terms, eligibility, dispute, billing, deletion, and governing-law language require owner and legal approval before release.",
    ],
    title: "Terms preview",
  },
} as const;

export default function LegalDocumentRoute() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document: string }>();
  const content = documents[document as keyof typeof documents] ?? documents.support;

  return (
    <Screen>
      <PageHeader
        actionLabel="Back"
        onAction={() => router.back()}
        subtitle="Local Release 1 notice"
        title={content.title}
      />
      <Card>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LOCAL PREVIEW — NOT FINAL LEGAL TEXT</Text>
        </View>
        {content.body.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.lavender,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText: {
    color: colors.purpleDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  paragraph: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
});
