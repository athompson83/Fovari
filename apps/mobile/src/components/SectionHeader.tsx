import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

interface SectionHeaderProps {
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
  title: string;
}

export function SectionHeader({ actionLabel, onAction, subtitle, title }: SectionHeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
  },
  root: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
  },
});
