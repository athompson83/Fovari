import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radii } from "@fovari/design-system";

export interface ProgressBarProps {
  accessibilityLabel: string;
  color?: string;
  progress: number;
  style?: ViewStyle;
}

export function ProgressBar({
  accessibilityLabel,
  color = colors.purple,
  progress,
  style,
}: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: Math.round(normalized * 100) }}
      style={[styles.track, style]}
    >
      <View style={[styles.fill, { backgroundColor: color, width: `${normalized * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radii.pill,
    height: "100%",
  },
  track: {
    backgroundColor: colors.line,
    borderRadius: radii.pill,
    height: 9,
    overflow: "hidden",
    width: "100%",
  },
});
