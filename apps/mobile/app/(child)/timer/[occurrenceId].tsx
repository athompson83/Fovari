import { Redirect, useLocalSearchParams } from "expo-router";

export default function TimerRoute() {
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId: string }>();
  return (
    <Redirect
      href={{
        pathname: "/(child)/goal/[occurrenceId]",
        params: { occurrenceId },
      }}
    />
  );
}
