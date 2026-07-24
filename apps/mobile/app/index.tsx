import { useRouter } from "expo-router";

import { WelcomeScreen } from "../src/components/WelcomeScreen";

export default function WelcomeRoute() {
  const router = useRouter();
  return (
    <WelcomeScreen
      onCreateAccount={() => router.push("/onboarding")}
      onDemo={() => router.replace("/(parent)/(tabs)/family")}
      onOpenLink={(label) =>
        router.push({
          pathname: "/legal/[document]",
          params: { document: label.toLowerCase() },
        })
      }
    />
  );
}
