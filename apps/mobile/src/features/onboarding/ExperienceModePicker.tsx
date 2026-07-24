import { Pressable, StyleSheet, Text, View } from "react-native";

import { getAgeModeTokens, radii, spacing } from "@fovari/design-system";
import type { ExperienceMode } from "@fovari/domain";

const modes: readonly {
  ageLabel: string;
  accessibilityAge: string;
  emoji: string;
  mode: ExperienceMode;
}[] = [
  { accessibilityAge: "4 to 7", ageLabel: "Ages 4–7", emoji: "🦕", mode: "explorer" },
  { accessibilityAge: "8 to 11", ageLabel: "Ages 8–11", emoji: "🦝", mode: "adventurer" },
  {
    accessibilityAge: "12 to 14",
    ageLabel: "Ages 12–14",
    emoji: "🦊",
    mode: "independence",
  },
  { accessibilityAge: "15 to 17", ageLabel: "Ages 15–17", emoji: "🚀", mode: "launch" },
];

interface ExperienceModePickerProps {
  disabled?: boolean;
  onChange(mode: ExperienceMode): void;
  value: ExperienceMode | null;
}

export function ExperienceModePicker({
  disabled = false,
  onChange,
  value,
}: ExperienceModePickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.grid}>
      {modes.map(({ accessibilityAge, ageLabel, emoji, mode }) => {
        const tokens = getAgeModeTokens(mode);
        const selected = value === mode;
        return (
          <Pressable
            aria-checked={selected}
            accessibilityLabel={`${tokens.label} ages ${accessibilityAge}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            key={mode}
            onPress={() => onChange(mode)}
            style={[
              styles.option,
              {
                backgroundColor: tokens.surface,
                borderColor: selected ? tokens.accent : `${tokens.accent}55`,
                minHeight: tokens.minimumTouchTarget,
              },
              selected && styles.selected,
            ]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={styles.copy}>
              <Text style={[styles.label, { color: tokens.accent }]}>{tokens.label}</Text>
              <Text style={styles.age}>{ageLabel}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  age: {
    color: "#5F6678",
    fontSize: 12,
    marginTop: 2,
  },
  copy: {
    flex: 1,
  },
  emoji: {
    fontSize: 25,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
  },
  option: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 210,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  selected: {
    borderWidth: 3,
    padding: spacing.md - 2,
  },
});
