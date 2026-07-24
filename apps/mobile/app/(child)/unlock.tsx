import { Redirect } from "expo-router";

export default function UnlockRoute() {
  return <Redirect href="/(child)/parent-gate" />;
}
