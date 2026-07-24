import type { PropsWithChildren } from "react";
import { StyleSheet, Text } from "react-native";

import type { FamilySession } from "@fovari/api-client";
import { colors, spacing } from "@fovari/design-system";

import { Button } from "./Button";
import { Card } from "./Card";
import { LoadingState } from "./LoadingState";

interface RouteGuardProps {
  allow: "adult" | "child";
  onRecover(): void;
  session: FamilySession | null;
}

export function RouteGuard({
  allow,
  children,
  onRecover,
  session,
}: PropsWithChildren<RouteGuardProps>) {
  if (!session) return <LoadingState />;

  const allowed =
    (allow === "adult" && session.kind === "adult") ||
    (allow === "child" && session.kind === "child");
  if (allowed) return <>{children}</>;

  return (
    <Card>
      <Text style={styles.title}>
        {allow === "adult" ? "Grown-up access required" : "Choose a child profile"}
      </Text>
      <Text style={styles.copy}>
        This area is protected. Return to the profile screen to continue safely.
      </Text>
      <Button onPress={onRecover}>Return safely</Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
});
