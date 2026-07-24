import { useRouter } from "expo-router";

import { LoadingState } from "../../../src/components/LoadingState";
import { Screen } from "../../../src/components/Screen";
import { ChildHome } from "../../../src/features/child/ChildHome";
import { useFamilySnapshot } from "../../../src/hooks/use-family";

export default function ChildHomeRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  if (!snapshot) return <LoadingState />;

  const child =
    snapshot.children.find((item) => item.id === snapshot.activeChildId) ?? snapshot.children[0];
  if (!child) return <LoadingState />;

  const selectedReward = snapshot.rewards.find(
    (item) => item.id === snapshot.selectedRewardByChild[child.id],
  );
  const rewardProps = selectedReward ? { reward: selectedReward } : {};

  return (
    <Screen>
      <ChildHome
        child={child}
        goals={snapshot.goals.filter((goal) => goal.childId === child.id)}
        onOpenGoal={(goalId) =>
          router.push({
            pathname: "/(child)/goal/[occurrenceId]",
            params: { occurrenceId: goalId },
          })
        }
        onParentGate={() => router.push("/(child)/parent-gate")}
        {...rewardProps}
      />
    </Screen>
  );
}
