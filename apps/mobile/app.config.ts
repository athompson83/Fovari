import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Fovari",
  slug: "fovari",
  scheme: "fovari",
  version: "0.1.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.fovari.mobile.dev",
    supportsTablet: true,
  },
  android: {
    package: "com.fovari.mobile.dev",
    adaptiveIcon: {
      backgroundColor: "#F4F2FF",
    },
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Allow Fovari to confirm an adult action.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV ?? "local",
    dataMode: process.env.EXPO_PUBLIC_DATA_MODE ?? "demo",
  },
});
