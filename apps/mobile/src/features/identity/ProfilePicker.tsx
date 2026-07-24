import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ChildSummary } from "@fovari/api-client";
import { colors, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/Card";

interface ProfilePickerProps {
  children: readonly ChildSummary[];
  onSelect: (childId: string) => void;
}

export function ProfilePicker({ children, onSelect }: ProfilePickerProps) {
  return (
    <View>
      <Text style={styles.eyebrow}>CHILD SIGN-IN</Text>
      <Text style={styles.title}>Who is using Fovari?</Text>
      <Text style={styles.copy}>
        Choose your profile. Protected profiles ask for a private PIN on the next screen.
      </Text>
      <View style={styles.grid}>
        {children.map((child) => (
          <Pressable
            accessibilityHint={
              child.pinConfigured ? "Opens the secure PIN screen" : "Opens this child profile"
            }
            accessibilityLabel={`Choose ${child.name}`}
            accessibilityRole="button"
            key={child.id}
            onPress={() => onSelect(child.id)}
            style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
          >
            <Card style={styles.card}>
              <Avatar name={child.name} size={64} />
              <View style={styles.identity}>
                <Text style={styles.name}>{child.name}</Text>
                <Text style={styles.meta}>
                  {child.pinConfigured ? "PIN protected" : "Ready to open"} · Level {child.level}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 96,
  },
  chevron: {
    color: colors.purple,
    fontSize: 30,
    fontWeight: "800",
  },
  copy: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  grid: {
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    marginHorizontal: spacing.lg,
  },
  meta: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 4,
  },
  name: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  profile: {
    borderRadius: radii.lg,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
});
