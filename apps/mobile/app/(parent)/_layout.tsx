import { Redirect, Stack, useRouter } from "expo-router";

import { RouteGuard } from "../../src/components/RouteGuard";
import { useFamilySession } from "../../src/hooks/use-family";

export default function ParentLayout() {
  const router = useRouter();
  const session = useFamilySession();

  if (session?.kind === "signed_out") {
    return <Redirect href="/(child)/select-profile" />;
  }

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
