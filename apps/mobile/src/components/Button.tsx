import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  loading?: boolean;
  style?: ViewStyle;
  tone?: "primary" | "secondary" | "quiet";
}

export function Button({
  accessibilityLabel,
  children,
  disabled,
  loading = false,
  style,
  tone = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        tone === "primary" && styles.primary,
        tone === "secondary" && styles.secondary,
        tone === "quiet" && styles.quiet,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === "primary" ? colors.surface : colors.purple} />
      ) : (
        <Text
          style={[styles.label, tone === "primary" ? styles.primaryLabel : styles.secondaryLabel]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  primary: {
    backgroundColor: colors.purple,
  },
  primaryLabel: {
    color: colors.surface,
  },
  quiet: {
    backgroundColor: "transparent",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: colors.purpleDark,
  },
});
