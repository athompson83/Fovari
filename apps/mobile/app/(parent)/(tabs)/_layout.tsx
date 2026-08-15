import { AppTabs } from "../../../src/components/AppTabs";

const tabs = [
  { icon: "people-outline", name: "family", title: "Family" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "add-circle", name: "add", title: "Add" },
  { icon: "gift-outline", name: "rewards", title: "Rewards" },
  { icon: "bar-chart-outline", name: "insights", title: "Insights" },
] as const;

export default function ParentTabsLayout() {
  return <AppTabs tabs={tabs} />;
}
