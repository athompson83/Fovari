import { AppTabs } from "../../../src/components/AppTabs";

const tabs = [
  { icon: "home-outline", name: "home", title: "Home" },
  { icon: "checkmark-circle-outline", name: "goals", title: "Goals" },
  { icon: "gift-outline", name: "rewards", title: "Rewards" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "person-outline", name: "profile", title: "Profile" },
] as const;

export default function ChildTabsLayout() {
  return <AppTabs tabs={tabs} />;
}
