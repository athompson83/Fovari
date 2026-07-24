import { Stack, useRouter } from "expo-router";

import { RouteGuard } from "../../src/components/RouteGuard";
import { useFamilySession } from "../../src/hooks/use-family";

export default function ParentLayout() {
  const router = useRouter();
  const session = useFamilySession();

  return (
    <RouteGuard
      allow="adult"
      onRecover={() => router.replace("/(child)/parent-gate")}
      session={session}
    >
      <Stack screenOptions={{ headerShown: false, presentation: "card" }} />
    </RouteGuard>
  );
}
