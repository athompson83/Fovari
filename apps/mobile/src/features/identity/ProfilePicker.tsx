import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ChildSummary } from "@fovari/api-client";
import { colors, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

interface ProfilePickerProps {
  children: readonly ChildSummary[];
  disabled?: boolean;
  onParentRecovery?: () => void;
  onSelect: (childId: string) => void;
}

export function ProfilePicker({
  children,
  disabled = false,
  onParentRecovery,
  onSelect,
}: ProfilePickerProps) {
  return (
    <View>
      <Text style={styles.eyebrow}>CHILD SIGN-IN</Text>
      <Text style={styles.title}>Who is using Fovari?</Text>
      <Text style={styles.copy}>
        Choose your profile. Protected profiles ask for a private PIN on the next screen.
      </Text>
      {children.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>No child profiles are available.</Text>
          <Text style={styles.emptyCopy}>Ask a grown-up to finish setting up the family.</Text>
          <Button accessibilityLabel="Ask a grown-up" onPress={onParentRecovery} tone="secondary">
            Ask a grown-up
          </Button>
        </Card>
      ) : (
        <View style={styles.grid}>
          {children.map((child) => (
            <Pressable
              accessibilityHint={
                child.pinConfigured ? "Opens the secure PIN screen" : "Opens this child profile"
              }
              accessibilityLabel={`Choose ${child.name}`}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              key={child.id}
              onPress={() => onSelect(child.id)}
              style={({ pressed }) => [
                styles.profile,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
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
      )}
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
  disabled: {
    opacity: 0.5,
  },
  empty: {
    maxWidth: 560,
  },
  emptyCopy: {
    color: colors.inkMuted,
    fontSize: 14,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
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
