import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@fovari/design-system";
import { ONBOARDING_STEPS, type OnboardingStep } from "@fovari/domain";

import { ProgressBar } from "../../components/ProgressBar";

const labels: Record<Exclude<OnboardingStep, "complete">, string> = {
  adult: "About you",
  children: "Children",
  family: "Your family",
  notifications: "Preferences",
  review: "Review",
  starter_goals: "Starter goals",
  starter_rewards: "Starter rewards",
};

interface OnboardingProgressProps {
  step: Exclude<OnboardingStep, "complete">;
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const index = ONBOARDING_STEPS.indexOf(step);
  const position = index + 1;

  return (
    <View style={styles.root}>
      <View style={styles.labels}>
        <Text style={styles.step}>
          STEP {position} OF {ONBOARDING_STEPS.length}
        </Text>
        <Text style={styles.label}>{labels[step]}</Text>
      </View>
      <ProgressBar
        accessibilityLabel={`Onboarding step ${position} of ${ONBOARDING_STEPS.length}`}
        progress={position / ONBOARDING_STEPS.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  root: {
    marginBottom: spacing.xl,
  },
  step: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
