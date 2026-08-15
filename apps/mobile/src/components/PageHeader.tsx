import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { FovariLogo } from "./FovariLogo";

interface PageHeaderProps {
  actionLabel?: string;
  eyebrow?: string;
  onAction?: () => void;
  subtitle?: string;
  title: string;
}

export function PageHeader({ actionLabel, eyebrow, onAction, subtitle, title }: PageHeaderProps) {
  const { width } = useWindowDimensions();
  const narrow = width <= 480;

  return (
    <View style={[styles.root, narrow && styles.rootNarrow]} testID="page-header">
      <View style={styles.heading} testID="page-header-heading">
        <View style={styles.brand}>
          <FovariLogo compact />
        </View>
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={[styles.action, narrow && styles.actionNarrow]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: colors.lavender,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  actionText: {
    color: colors.purpleDark,
    fontSize: 14,
    fontWeight: "800",
  },
  actionNarrow: {
    alignSelf: "stretch",
    marginTop: spacing.md,
  },
  brand: {
    marginRight: spacing.lg,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  heading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  root: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  rootNarrow: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    marginTop: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
});
