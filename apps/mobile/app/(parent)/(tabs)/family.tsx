import { useRouter } from "expo-router";

import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { ParentDashboard } from "../../../src/features/parent/ParentDashboard";
import { useFamilyAction, useFamilySnapshot } from "../../../src/hooks/use-family";

export default function FamilyRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { repository, run } = useFamilyAction();

  if (!snapshot) {
    return <LoadingState />;
  }

  const handoff = async () => {
    await run(() => repository.signOut());
    router.replace("/(child)/select-profile");
  };

  return (
    <Screen>
      <PageHeader
        actionLabel="Family settings"
        onAction={() => router.push("/(parent)/privacy")}
        subtitle={snapshot.familyName}
        title="Family"
      />
      <ParentDashboard
        onAdd={() => router.push("/(parent)/(tabs)/add")}
        onHandoff={() => void handoff()}
        onOpenApprovals={() => router.push("/(parent)/approvals")}
        snapshot={snapshot}
      />
    </Screen>
  );
}
