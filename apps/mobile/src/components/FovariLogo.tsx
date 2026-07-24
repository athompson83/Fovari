import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

export interface FovariLogoProps {
  compact?: boolean;
  inverse?: boolean;
}

export function FovariLogo({ compact = false, inverse = false }: FovariLogoProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Text style={[styles.star, compact && styles.compactStar]}>★</Text>
      </View>
      <View>
        <Text
          style={[styles.wordmark, compact && styles.compactWordmark, inverse && styles.inverse]}
        >
          Fovari
        </Text>
        {!compact ? (
          <Text style={[styles.kicker, inverse && styles.inverseMuted]}>FAMILY WINS, TOGETHER</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactMark: {
    borderRadius: radii.sm,
    height: 36,
    width: 36,
  },
  compactStar: {
    fontSize: 19,
  },
  compactWordmark: {
    fontSize: 23,
  },
  inverse: {
    color: colors.surface,
  },
  inverseMuted: {
    color: "#D9D5FF",
  },
  kicker: {
    color: colors.inkMuted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.35,
    marginTop: 2,
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.purple,
    borderRadius: radii.md,
    height: 50,
    justifyContent: "center",
    shadowColor: colors.purpleDark,
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    width: 50,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  star: {
    color: colors.yellow,
    fontSize: 28,
    lineHeight: 32,
  },
  wordmark: {
    color: colors.purpleDark,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
});
