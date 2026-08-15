import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { colors } from "@fovari/design-system";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface TabDefinition {
  icon: IconName;
  name: string;
  title: string;
}

interface AppTabsProps {
  tabs: readonly TabDefinition[];
}

export function AppTabs({ tabs }: AppTabsProps) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name={tab.icon} size={size} />,
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}
