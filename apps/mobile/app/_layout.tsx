import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "../src/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: "#F7F8FC" },
          headerShadowVisible: false,
          headerShown: false,
        }}
      />
    </AppProviders>
  );
}
