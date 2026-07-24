import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";

export function LoadingState() {
  return (
    <View accessibilityLabel="Loading family" accessibilityRole="progressbar" style={styles.root}>
      <ActivityIndicator color={colors.purple} size="large" />
      <Text style={styles.text}>Gathering your family wins…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 360,
  },
  text: {
    color: colors.inkMuted,
    fontSize: 15,
    marginTop: spacing.md,
  },
});
