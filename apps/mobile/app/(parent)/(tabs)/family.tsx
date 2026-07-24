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

  const handoff = async (childId: string) => {
    const child = snapshot.children.find((item) => item.id === childId);
    if (!child) return;
    await run(async () => {
      await repository.selectChild(childId);
      return repository.switchActor({ childId, id: childId, role: "child" });
    });
    router.replace("/(child)/(tabs)/home");
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
        onHandoff={(childId) => void handoff(childId)}
        onOpenApprovals={() => router.push("/(parent)/approvals")}
        snapshot={snapshot}
      />
    </Screen>
  );
}
