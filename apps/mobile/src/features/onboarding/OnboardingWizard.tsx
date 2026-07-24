import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  CompleteFamilySetupInput,
  OnboardingDraft,
  SaveOnboardingDraftInput,
} from "@fovari/api-client";
import { colors, radii, spacing } from "@fovari/design-system";
import {
  completeOnboardingStep,
  createOnboardingState,
  type ExperienceMode,
  type OnboardingState,
  type OnboardingStep,
} from "@fovari/domain";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { Screen } from "../../components/Screen";
import { STARTER_GOALS, STARTER_REWARDS } from "../../data/starter-content";
import { ExperienceModePicker } from "./ExperienceModePicker";
import { OnboardingProgress } from "./OnboardingProgress";

type WizardStep = Exclude<OnboardingStep, "complete">;

export interface OnboardingWizardProps {
  busy: boolean;
  completeFamilySetup(input: CompleteFamilySetupInput): Promise<unknown>;
  error: string | null;
  initialDraft: OnboardingDraft | null;
  initialOnboarding?: OnboardingState | null;
  saveOnboardingDraft(input: SaveOnboardingDraftInput): Promise<unknown>;
}

export const createDefaultOnboardingDraft = (): OnboardingDraft => ({
  adultDisplayName: "",
  childDrafts: [],
  familyName: "",
  notificationPreferences: {
    approvalUpdates: true,
    childEncouragement: true,
    enabled: false,
    quietHoursEnd: "07:00",
    quietHoursStart: "20:00",
    weeklySummary: true,
  },
  pointsName: "Stars",
  selectedStarterGoalIds: [],
  selectedStarterRewardIds: [],
  timezone: "America/New_York",
});

const isWizardStep = (step: OnboardingStep): step is WizardStep => step !== "complete";
const validPin = (pin: string) => /^\d{4,6}$/.test(pin);
const validLocalTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const initialStateFor = (initialOnboarding?: OnboardingState | null): OnboardingState =>
  initialOnboarding && isWizardStep(initialOnboarding.currentStep)
    ? structuredClone(initialOnboarding)
    : createOnboardingState();

const CheckOption = ({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress(): void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    onPress={onPress}
    style={[styles.checkOption, checked && styles.checkOptionSelected]}
  >
    <View style={[styles.checkBox, checked && styles.checkBoxSelected]}>
      <Text style={styles.checkMark}>{checked ? "✓" : ""}</Text>
    </View>
    <Text style={styles.checkLabel}>{label}</Text>
  </Pressable>
);

const StarterGoalOptions = ({
  selectedIds,
  toggle,
}: {
  selectedIds: readonly string[];
  toggle(id: string): void;
}) => (
  <View style={styles.optionGrid}>
    {STARTER_GOALS.map((goal) => {
      const checked = selectedIds.includes(goal.id);
      return (
        <Pressable
          accessibilityLabel={`Select starter goal ${goal.title}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          key={goal.id}
          onPress={() => toggle(goal.id)}
          style={[styles.starterOption, checked && styles.starterSelected]}
        >
          <Text style={styles.starterEmoji}>{goal.emoji}</Text>
          <View style={styles.starterCopy}>
            <Text style={styles.starterTitle}>{goal.title}</Text>
            <Text style={styles.starterMeta}>{goal.pointValue} Stars</Text>
          </View>
        </Pressable>
      );
    })}
  </View>
);

const StarterRewardOptions = ({
  selectedIds,
  toggle,
}: {
  selectedIds: readonly string[];
  toggle(id: string): void;
}) => (
  <View style={styles.optionGrid}>
    {STARTER_REWARDS.map((reward) => {
      const checked = selectedIds.includes(reward.id);
      return (
        <Pressable
          accessibilityLabel={`Select starter reward ${reward.title}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          key={reward.id}
          onPress={() => toggle(reward.id)}
          style={[styles.starterOption, checked && styles.starterSelected]}
        >
          <Text style={styles.starterEmoji}>{reward.emoji}</Text>
          <View style={styles.starterCopy}>
            <Text style={styles.starterTitle}>{reward.title}</Text>
            <Text style={styles.starterMeta}>{reward.pointCost} Stars</Text>
          </View>
        </Pressable>
      );
    })}
  </View>
);

export function OnboardingWizard({
  busy,
  completeFamilySetup,
  error,
  initialDraft,
  initialOnboarding,
  saveOnboardingDraft,
}: OnboardingWizardProps) {
  const [onboarding, setOnboarding] = useState(() => initialStateFor(initialOnboarding));
  const [step, setStep] = useState<WizardStep>(() => {
    const initial = initialStateFor(initialOnboarding);
    return isWizardStep(initial.currentStep) ? initial.currentStep : "adult";
  });
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    structuredClone(initialDraft ?? createDefaultOnboardingDraft()),
  );
  const [childPins, setChildPins] = useState<Record<string, string>>({});
  const [childName, setChildName] = useState("");
  const [childMode, setChildMode] = useState<ExperienceMode | null>(null);
  const [pinRequested, setPinRequested] = useState(false);
  const [pendingPin, setPendingPin] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sequence = useRef(0);
  const savingRef = useRef(false);
  const completionStarted = useRef(false);

  const updateDraft = (next: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setValidationError(null);
  };

  const toggleId = (key: "selectedStarterGoalIds" | "selectedStarterRewardIds", id: string) => {
    const selected = draft[key];
    updateDraft({
      [key]: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
    });
  };

  const validateStep = (activeStep: WizardStep): string | null => {
    if (activeStep === "adult" && !draft.adultDisplayName.trim()) {
      return "Enter your display name.";
    }
    if (activeStep === "adult" && draft.adultDisplayName.trim().length > 40) {
      return "Keep your display name to 40 characters.";
    }
    if (activeStep === "family" && !draft.familyName.trim()) {
      return "Enter a family name.";
    }
    if (activeStep === "family" && draft.familyName.trim().length > 80) {
      return "Keep your family name to 80 characters.";
    }
    if (activeStep === "family" && !draft.pointsName.trim()) {
      return "Enter a family points name.";
    }
    if (activeStep === "family" && draft.pointsName.trim().length > 24) {
      return "Keep the family points name to 24 characters.";
    }
    if (activeStep === "family" && draft.timezone !== "UTC" && !draft.timezone.includes("/")) {
      return "Choose a valid family timezone.";
    }
    if (activeStep === "children" && draft.childDrafts.length === 0) {
      return "Add at least one child.";
    }
    if (
      activeStep === "children" &&
      draft.childDrafts.some(
        (child) => child.pinRequested && !validPin(childPins[child.clientId] ?? ""),
      )
    ) {
      return "Use a 4 to 6 digit PIN for each protected child.";
    }
    if (activeStep === "starter_goals" && draft.selectedStarterGoalIds.length === 0) {
      return "Choose at least one starter goal.";
    }
    if (activeStep === "starter_rewards" && draft.selectedStarterRewardIds.length === 0) {
      return "Choose at least one starter reward.";
    }
    if (
      activeStep === "notifications" &&
      (!validLocalTime(draft.notificationPreferences.quietHoursStart) ||
        !validLocalTime(draft.notificationPreferences.quietHoursEnd))
    ) {
      return "Use a valid 24-hour time.";
    }
    return null;
  };

  const continueStep = async () => {
    if (busy || savingRef.current) return;
    const invalid = validateStep(step);
    if (invalid) {
      setValidationError(invalid);
      return;
    }

    const next = completeOnboardingStep(onboarding, step);
    if (!next.ok) {
      setValidationError(next.error.message);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setValidationError(null);
    try {
      await saveOnboardingDraft({ draft, onboarding: next.value });
      setOnboarding(next.value);
      if (isWizardStep(next.value.currentStep)) setStep(next.value.currentStep);
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : "Unable to save this step.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const addChild = () => {
    const displayName = childName.trim();
    if (!displayName) {
      setValidationError("Enter a child name.");
      return;
    }
    if (displayName.length > 40) {
      setValidationError("Keep the child name to 40 characters.");
      return;
    }
    if (!childMode) {
      setValidationError("Choose an experience mode.");
      return;
    }
    if (pinRequested && !validPin(pendingPin)) {
      setValidationError("Use a 4 to 6 digit PIN.");
      return;
    }

    sequence.current += 1;
    const clientId = `child-draft-${Date.now()}-${sequence.current}`;
    updateDraft({
      childDrafts: [
        ...draft.childDrafts,
        { clientId, displayName, experienceMode: childMode, pinRequested },
      ],
    });
    if (pinRequested) {
      setChildPins((current) => ({ ...current, [clientId]: pendingPin }));
    }
    setChildName("");
    setChildMode(null);
    setPinRequested(false);
    setPendingPin("");
  };

  const removeChild = (clientId: string) => {
    updateDraft({
      childDrafts: draft.childDrafts.filter((child) => child.clientId !== clientId),
    });
    setChildPins((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
  };

  const finishSetup = async () => {
    if (busy || savingRef.current || completionStarted.current) return;
    const missingPin = draft.childDrafts.find(
      (child) => child.pinRequested && !validPin(childPins[child.clientId] ?? ""),
    );
    if (missingPin) {
      setValidationError(`Enter a 4 to 6 digit PIN for ${missingPin.displayName}.`);
      return;
    }

    completionStarted.current = true;
    savingRef.current = true;
    setSaving(true);
    setValidationError(null);
    try {
      await completeFamilySetup({ childPins, draft });
    } catch (cause) {
      completionStarted.current = false;
      setValidationError(cause instanceof Error ? cause.message : "Unable to create your family.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const message = validationError ?? error;
  const action = step === "review" ? "Create my family" : "Continue";

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>PRIVATE, LOCAL FAMILY SETUP</Text>
          <Text style={styles.heading}>Set up your family</Text>
          <Text style={styles.introCopy}>
            This preview stays on this device. Use made-up names and a practice PIN while exploring.
          </Text>
        </View>
        <Card style={styles.card}>
          <OnboardingProgress step={step} />

          {step === "adult" ? (
            <>
              <Text style={styles.title}>Let’s start with you.</Text>
              <Text style={styles.copy}>Choose the name your family will see around Fovari.</Text>
              <FormField
                autoCapitalize="words"
                label="Your display name"
                onChangeText={(adultDisplayName) => updateDraft({ adultDisplayName })}
                placeholder="Example: Morgan"
                value={draft.adultDisplayName}
              />
            </>
          ) : null}

          {step === "family" ? (
            <>
              <Text style={styles.title}>Name your family space.</Text>
              <Text style={styles.copy}>
                You can change these local preferences later from family settings.
              </Text>
              <FormField
                autoCapitalize="words"
                label="Family name"
                onChangeText={(familyName) => updateDraft({ familyName })}
                placeholder="Example: The Park Family"
                value={draft.familyName}
              />
              <FormField
                label="Family points name"
                onChangeText={(pointsName) => updateDraft({ pointsName })}
                value={draft.pointsName}
              />
            </>
          ) : null}

          {step === "children" ? (
            <>
              <Text style={styles.title}>Add your children.</Text>
              <Text style={styles.copy}>
                Add more than one child if you like. Each experience adapts its language and touch
                targets by age.
              </Text>
              {draft.childDrafts.map((child) => (
                <View key={child.clientId} style={styles.childCard}>
                  <View style={styles.childSummary}>
                    <Text style={styles.childName}>{child.displayName}</Text>
                    <Text style={styles.childMode}>
                      {child.experienceMode}
                      {child.pinRequested ? " · PIN protected" : ""}
                    </Text>
                  </View>
                  <Button
                    accessibilityLabel={`Remove ${child.displayName}`}
                    onPress={() => removeChild(child.clientId)}
                    tone="quiet"
                  >
                    Remove
                  </Button>
                </View>
              ))}
              <View style={styles.childComposer}>
                <FormField
                  autoCapitalize="words"
                  label="Child name"
                  onChangeText={(value) => {
                    setChildName(value);
                    setValidationError(null);
                  }}
                  placeholder="Example: Maya"
                  value={childName}
                />
                <ExperienceModePicker
                  onChange={(mode) => {
                    setChildMode(mode);
                    setValidationError(null);
                  }}
                  value={childMode}
                />
                <CheckOption
                  checked={pinRequested}
                  label="Use a PIN for this child"
                  onPress={() => {
                    setPinRequested((current) => !current);
                    setPendingPin("");
                    setValidationError(null);
                  }}
                />
                {pinRequested ? (
                  <FormField
                    keyboardType="number-pad"
                    label="Child PIN"
                    maxLength={6}
                    onChangeText={(value) => {
                      setPendingPin(value.replace(/\D/g, ""));
                      setValidationError(null);
                    }}
                    placeholder="4 to 6 digits"
                    secureTextEntry
                    value={pendingPin}
                  />
                ) : null}
                <Button onPress={addChild} tone="secondary">
                  Add child
                </Button>
              </View>
            </>
          ) : null}

          {step === "starter_goals" ? (
            <>
              <Text style={styles.title}>Choose a starter goal</Text>
              <Text style={styles.copy}>
                Pick at least one practice routine. A copy is created for every child.
              </Text>
              <StarterGoalOptions
                selectedIds={draft.selectedStarterGoalIds}
                toggle={(id) => toggleId("selectedStarterGoalIds", id)}
              />
            </>
          ) : null}

          {step === "starter_rewards" ? (
            <>
              <Text style={styles.title}>Choose a starter reward</Text>
              <Text style={styles.copy}>
                Start with something simple and family-approved. You can add more later.
              </Text>
              <StarterRewardOptions
                selectedIds={draft.selectedStarterRewardIds}
                toggle={(id) => toggleId("selectedStarterRewardIds", id)}
              />
            </>
          ) : null}

          {step === "notifications" ? (
            <>
              <Text style={styles.title}>Choose your local preferences.</Text>
              <Text style={styles.copy}>
                These are preview settings only. Fovari will not send real messages from this build.
              </Text>
              <CheckOption
                checked={draft.notificationPreferences.enabled}
                label="Enable family notifications"
                onPress={() =>
                  updateDraft({
                    notificationPreferences: {
                      ...draft.notificationPreferences,
                      enabled: !draft.notificationPreferences.enabled,
                    },
                  })
                }
              />
              <CheckOption
                checked={draft.notificationPreferences.approvalUpdates}
                label="Approval updates"
                onPress={() =>
                  updateDraft({
                    notificationPreferences: {
                      ...draft.notificationPreferences,
                      approvalUpdates: !draft.notificationPreferences.approvalUpdates,
                    },
                  })
                }
              />
              <CheckOption
                checked={draft.notificationPreferences.childEncouragement}
                label="Child encouragement"
                onPress={() =>
                  updateDraft({
                    notificationPreferences: {
                      ...draft.notificationPreferences,
                      childEncouragement: !draft.notificationPreferences.childEncouragement,
                    },
                  })
                }
              />
              <CheckOption
                checked={draft.notificationPreferences.weeklySummary}
                label="Weekly family summary"
                onPress={() =>
                  updateDraft({
                    notificationPreferences: {
                      ...draft.notificationPreferences,
                      weeklySummary: !draft.notificationPreferences.weeklySummary,
                    },
                  })
                }
              />
            </>
          ) : null}

          {step === "review" ? (
            <>
              <Text style={styles.title}>Review your family setup.</Text>
              <Text style={styles.copy}>
                One final check before Fovari creates this synthetic family on your device.
              </Text>
              <View style={styles.reviewList}>
                <ReviewRow label="Adult" value={draft.adultDisplayName} />
                <ReviewRow label="Family" value={draft.familyName} />
                <ReviewRow
                  label="Children"
                  value={draft.childDrafts.map((child) => child.displayName).join(", ")}
                />
                <ReviewRow
                  label="Starter goals"
                  value={STARTER_GOALS.filter((goal) =>
                    draft.selectedStarterGoalIds.includes(goal.id),
                  )
                    .map((goal) => goal.title)
                    .join(", ")}
                />
                <ReviewRow
                  label="Starter rewards"
                  value={STARTER_REWARDS.filter((reward) =>
                    draft.selectedStarterRewardIds.includes(reward.id),
                  )
                    .map((reward) => reward.title)
                    .join(", ")}
                />
                <ReviewRow
                  label="Notifications"
                  value={[
                    draft.notificationPreferences.enabled ? "Enabled" : "Off",
                    draft.notificationPreferences.approvalUpdates ? "approval updates" : null,
                    draft.notificationPreferences.childEncouragement ? "child encouragement" : null,
                    draft.notificationPreferences.weeklySummary ? "weekly summary" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </View>
              {draft.childDrafts
                .filter((child) => child.pinRequested)
                .map((child) => (
                  <FormField
                    key={child.clientId}
                    keyboardType="number-pad"
                    label={`PIN for ${child.displayName}`}
                    maxLength={6}
                    onChangeText={(value) => {
                      setChildPins((current) => ({
                        ...current,
                        [child.clientId]: value.replace(/\D/g, ""),
                      }));
                      setValidationError(null);
                    }}
                    placeholder="Re-enter 4 to 6 digits"
                    secureTextEntry
                    value={childPins[child.clientId] ?? ""}
                  />
                ))}
            </>
          ) : null}

          {message ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              loading={busy || saving}
              onPress={() => void (step === "review" ? finishSetup() : continueStep())}
              style={styles.continueButton}
            >
              {busy || saving ? "Saving..." : action}
            </Button>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value || "None selected"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "flex-end",
    marginTop: spacing.xl,
  },
  card: {
    padding: spacing.xl,
  },
  checkBox: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkBoxSelected: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  checkLabel: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  checkMark: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
  },
  checkOption: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 52,
    padding: spacing.md,
  },
  checkOptionSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.purple,
  },
  childCard: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingLeft: spacing.lg,
  },
  childComposer: {
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  childMode: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
    textTransform: "capitalize",
  },
  childName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  childSummary: {
    flex: 1,
  },
  continueButton: {
    minWidth: 190,
  },
  copy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  error: {
    color: "#A42C4E",
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.lg,
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heading: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: spacing.sm,
  },
  intro: {
    marginBottom: spacing.xl,
  },
  introCopy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 650,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  reviewLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reviewList: {
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  reviewRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reviewValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  shell: {
    alignSelf: "center",
    maxWidth: 820,
    width: "100%",
  },
  starterCopy: {
    flex: 1,
  },
  starterEmoji: {
    fontSize: 30,
  },
  starterMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
  },
  starterOption: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 250,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.md,
    minHeight: 76,
    padding: spacing.lg,
  },
  starterSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.purple,
    borderWidth: 2,
    padding: spacing.lg - 1,
  },
  starterTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  title: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
});
