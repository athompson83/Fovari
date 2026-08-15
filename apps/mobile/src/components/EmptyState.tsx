import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

import { Button } from "./Button";

interface EmptyStateProps {
  actionLabel?: string;
  description: string;
  emoji: string;
  onAction?: () => void;
  title: string;
}

export function EmptyState({ actionLabel, description, emoji, onAction, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.md,
  },
  container: {
    alignItems: "center",
    padding: spacing.xxl,
  },
  description: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: "center",
  },
  emoji: {
    fontSize: 42,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.md,
  },
});
