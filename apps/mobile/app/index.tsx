import { useRouter } from "expo-router";

import { WelcomeScreen } from "../src/components/WelcomeScreen";

export default function WelcomeRoute() {
  const router = useRouter();
  return <WelcomeScreen onDemo={() => router.replace("/(parent)/(tabs)/family")} />;
}
