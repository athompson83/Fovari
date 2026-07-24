import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, getAgeModeTokens, radii, spacing } from "@fovari/design-system";

import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import {
  createLocalCommandId,
  useFamilyAction,
  useFamilySnapshot,
} from "../../../src/hooks/use-family";

export default function ChildRewardsRoute() {
  const snapshot = useFamilySnapshot();
  const { busy, error, repository, run } = useFamilyAction();
  const { width } = useWindowDimensions();
  if (!snapshot) return <LoadingState />;
  const child =
    snapshot.children.find((item) => item.id === snapshot.activeChildId) ?? snapshot.children[0];
  if (!child) return <LoadingState />;
  const mode = getAgeModeTokens(child.experienceMode);
  const wide = width >= 740;
  const selectedId = snapshot.selectedRewardByChild[child.id];

  const choose = async (rewardId: string) => {
    await run(() => repository.selectReward(child.id, rewardId));
  };

  const request = async (rewardId: string) => {
    const idempotencyKey = createLocalCommandId("redemption");
    await run(() =>
      repository.requestRedemption(
        {
          childId: child.id,
          familyId: snapshot.familyId,
          idempotencyKey,
          rewardId,
        },
        {
          actorId: child.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
  };

  return (
    <Screen>
      <PageHeader
        subtitle="Your stars are yours to plan."
        title={`${child.points} stars to spend`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <SectionHeader
        subtitle="Choose one reward to keep at the top of your home screen."
        title="Reward shop"
      />
      <View style={[styles.grid, wide && styles.gridWide]}>
        {snapshot.rewards.map((reward) => {
          const enough = child.points >= reward.pointCost;
          const selected = selectedId === reward.id;
          return (
            <Card
              key={reward.id}
              style={[
                styles.card,
                wide && styles.cardWide,
                selected && { borderColor: mode.accent, borderWidth: 2 },
              ]}
            >
              {selected ? <Text style={styles.chosen}>YOUR CHOSEN REWARD</Text> : null}
              <View style={[styles.rewardArt, { backgroundColor: reward.accent }]}>
                <Text style={styles.emoji}>{reward.emoji}</Text>
              </View>
              <Text style={styles.title}>{reward.title}</Text>
              <Text style={styles.cost}>{reward.pointCost} ★</Text>
              <ProgressBar
                accessibilityLabel={`Progress toward ${reward.title}`}
                color={enough ? colors.green : mode.accent}
                progress={Math.min(1, child.points / reward.pointCost)}
              />
              <Text style={styles.gap}>
                {enough ? "You have enough stars!" : `${reward.pointCost - child.points} to go`}
              </Text>
              <Button
                loading={busy}
                onPress={() => void (enough ? request(reward.id) : choose(reward.id))}
                tone={enough ? "primary" : "secondary"}
              >
                {enough ? "Ask a grown-up" : selected ? "Keep saving" : "Choose this"}
              </Button>
            </Card>
          );
        })}
      </View>
      <Text style={styles.safety}>
        A grown-up reviews every request. Asking for a reward never spends money.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardWide: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  chosen: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: spacing.sm,
  },
  cost: {
    color: colors.purple,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: spacing.md,
    marginTop: 4,
  },
  emoji: {
    fontSize: 48,
  },
  error: {
    backgroundColor: "#FFE7EF",
    borderRadius: radii.md,
    color: "#A42C4E",
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  gap: {
    color: colors.inkMuted,
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  rewardArt: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 112,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  safety: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
});
