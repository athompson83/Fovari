import { useRouter } from "expo-router";

import { AppTabs } from "../../../src/components/AppTabs";
import { RouteGuard } from "../../../src/components/RouteGuard";
import { useFamilySession } from "../../../src/hooks/use-family";

const tabs = [
  { icon: "home-outline", name: "home", title: "Home" },
  { icon: "checkmark-circle-outline", name: "goals", title: "Goals" },
  { icon: "gift-outline", name: "rewards", title: "Rewards" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "person-outline", name: "profile", title: "Profile" },
] as const;

export default function ChildTabsLayout() {
  const router = useRouter();
  const session = useFamilySession();

  return (
    <RouteGuard
      allow="child"
      onRecover={() => router.replace("/(child)/select-profile")}
      session={session}
    >
      <AppTabs tabs={tabs} />
    </RouteGuard>
  );
}
