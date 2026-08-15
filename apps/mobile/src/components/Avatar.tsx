import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@fovari/design-system";

interface AvatarProps {
  color?: string;
  name: string;
  size?: number;
}

export function Avatar({ color = colors.lavender, name, size = 52 }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      accessibilityLabel={`${name}'s avatar`}
      style={[styles.avatar, { backgroundColor: color, height: size, width: size }]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    justifyContent: "center",
  },
  initials: {
    color: colors.purpleDark,
    fontWeight: "900",
  },
});
