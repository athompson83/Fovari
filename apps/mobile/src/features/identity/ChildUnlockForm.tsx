import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ChildSummary, FamilyRepository } from "@fovari/api-client";
import { colors, spacing } from "@fovari/design-system";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";

interface ChildUnlockFormProps {
  child: ChildSummary;
  onParentRecovery?: () => void;
  onUnlocked?: () => void;
  unlockChild: FamilyRepository["unlockChild"];
}

function formatUnlockError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "This profile could not be opened.";
  const lockoutPrefix = "Profile locked until ";
  if (!message.startsWith(lockoutPrefix)) return message;

  const lockedUntil = new Date(message.slice(lockoutPrefix.length));
  if (Number.isNaN(lockedUntil.getTime())) return message;
  return `Profile locked. Try again at ${lockedUntil.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}.`;
}

function hasSelectedChildSession(
  snapshot: Awaited<ReturnType<FamilyRepository["unlockChild"]>>,
  childId: string,
) {
  return (
    snapshot.session.kind === "child" &&
    snapshot.session.childId === childId &&
    snapshot.session.actorId === childId &&
    snapshot.activeChildId === childId &&
    snapshot.activeActor.role === "child" &&
    snapshot.activeActor.id === childId &&
    snapshot.activeActor.childId === childId
  );
}

export function ChildUnlockForm({
  child,
  onParentRecovery,
  onUnlocked,
  unlockChild,
}: ChildUnlockFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const mounted = useRef(true);
  const requestGeneration = useRef(0);
  const unlockInFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    requestGeneration.current += 1;
    unlockInFlight.current = false;
    return () => {
      mounted.current = false;
      requestGeneration.current += 1;
      unlockInFlight.current = false;
    };
  }, [child.id]);

  const unlock = async () => {
    if (child.pinConfigured && !/^\d{4,6}$/.test(pin)) {
      setError("Use a 4 to 6 digit PIN.");
      return;
    }
    if (unlockInFlight.current) return;
    unlockInFlight.current = true;
    const generation = ++requestGeneration.current;
    setBusy(true);
    setError(null);
    try {
      const snapshot = await unlockChild({
        childId: child.id,
        now: Date.now(),
        ...(child.pinConfigured ? { pin } : {}),
      });
      if (!mounted.current || requestGeneration.current !== generation) return;
      if (!hasSelectedChildSession(snapshot, child.id)) {
        setError(`${child.name}'s child session could not be opened. Try again.`);
        return;
      }
      onUnlocked?.();
    } catch (cause) {
      if (mounted.current && requestGeneration.current === generation) {
        setError(formatUnlockError(cause));
      }
    } finally {
      if (requestGeneration.current === generation) {
        unlockInFlight.current = false;
        if (mounted.current) {
          setPin("");
          setBusy(false);
        }
      }
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.avatar}>
        <Avatar name={child.name} size={72} />
      </View>
      <Text style={styles.eyebrow}>CHILD SIGN-IN</Text>
      <Text style={styles.title}>Open {child.name}&apos;s space</Text>
      <Text style={styles.copy}>
        {child.pinConfigured
          ? "Enter the private PIN your grown-up set for this profile."
          : "This profile does not need a PIN. Continue when you are ready."}
      </Text>
      {child.pinConfigured ? (
        <FormField
          autoComplete="off"
          {...(error ? { error } : {})}
          inputMode="numeric"
          keyboardType="number-pad"
          label={`${child.name} PIN`}
          maxLength={6}
          onChangeText={(value) => {
            setPin(value.replace(/\D/g, ""));
            setError(null);
          }}
          placeholder="4 to 6 digits"
          secureTextEntry
          value={pin}
        />
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        accessibilityLabel={`Open ${child.name}'s space`}
        loading={busy}
        onPress={() => void unlock()}
      >
        Open {child.name}&apos;s space
      </Button>
      <Button
        accessibilityLabel="Ask a grown-up"
        disabled={busy}
        onPress={onParentRecovery}
        tone="quiet"
      >
        Ask a grown-up
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
  },
  card: {
    alignSelf: "center",
    maxWidth: 480,
    width: "100%",
  },
  copy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  error: {
    color: "#A42C4E",
    fontSize: 12,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
