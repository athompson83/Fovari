import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { Card } from "../../src/components/Card";
import { LoadingState } from "../../src/components/LoadingState";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useFamilySnapshot } from "../../src/hooks/use-family";

export default function LedgerRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;

  return (
    <Screen>
      <PageHeader
        actionLabel="Back"
        onAction={() => router.back()}
        subtitle="Append-only family history"
        title="Star ledger"
      />
      <Card>
        {snapshot.ledger
          .slice()
          .reverse()
          .map((entry) => {
            const child = snapshot.children.find((item) => item.id === entry.childId);
            return (
              <View key={entry.id} style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.description}>{entry.description}</Text>
                  <Text style={styles.meta}>
                    {child?.name} · {new Date(entry.occurredAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.amount, entry.amount < 0 && styles.debit]}>
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount} ★
                </Text>
              </View>
            );
          })}
      </Card>
      <Text style={styles.note}>
        Corrections and refunds create new entries. Historical transactions are never edited.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.green,
    fontSize: 16,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
  },
  debit: {
    color: colors.coral,
  },
  description: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 4,
  },
  note: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.lg,
  },
});
