import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors, radii, spacing } from "@fovari/design-system";

import { Avatar } from "../../../src/components/Avatar";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingState } from "../../../src/components/LoadingState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import {
  createLocalCommandId,
  useFamilyAction,
  useFamilySnapshot,
} from "../../../src/hooks/use-family";

export default function ParentRewardsRoute() {
  const router = useRouter();
  const snapshot = useFamilySnapshot();
  const { busy, repository, run } = useFamilyAction();
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  if (!snapshot) return <LoadingState />;

  const pending = snapshot.redemptions.filter(
    (redemption) => redemption.status === "requested" || redemption.status === "approved",
  );

  const decide = async (redemptionId: string, decision: "approve" | "fulfill") => {
    const idempotencyKey = createLocalCommandId(`reward-${decision}`);
    await run(() =>
      repository.decideRedemption(
        { decision, redemptionId },
        {
          actorId: snapshot.activeActor.id,
          familyId: snapshot.familyId,
          idempotencyKey,
        },
      ),
    );
  };

  return (
    <Screen>
      <PageHeader
        actionLabel="＋ New reward"
        onAction={() => router.push("/(parent)/reward/new")}
        subtitle="Experiences and privileges chosen by your family"
        title="Rewards"
      />

      <SectionHeader
        subtitle={
          pending.length ? "These requests need an adult decision." : "Nothing needs attention."
        }
        title="Reward requests"
      />
      {pending.length ? (
        pending.map((redemption) => {
          const child = snapshot.children.find((item) => item.id === redemption.childId);
          const reward = snapshot.rewards.find((item) => item.id === redemption.rewardId);
          return (
            <Card key={redemption.id} style={styles.requestCard}>
              <Avatar name={child?.name ?? "Child"} size={48} />
              <View style={styles.requestCopy}>
                <Text style={styles.requestTitle}>
                  {child?.name} requested {reward?.title}
                </Text>
                <Text style={styles.requestMeta}>
                  {redemption.pointCost} stars · {redemption.status}
                </Text>
              </View>
              <Button
                loading={busy}
                onPress={() =>
                  void decide(
                    redemption.id,
                    redemption.status === "requested" ? "approve" : "fulfill",
                  )
                }
                style={styles.decisionButton}
              >
                {redemption.status === "requested" ? "Approve" : "Mark fulfilled"}
              </Button>
            </Card>
          );
        })
      ) : (
        <Card style={styles.emptyCard}>
          <EmptyState
            description="When a child asks for a reward, the request and point impact will appear here."
            emoji="🎁"
            title="No reward requests"
          />
        </Card>
      )}

      <SectionHeader
        subtitle={`${snapshot.rewards.length} rewards available across the family`}
        title="Family catalog"
      />
      <View style={[styles.grid, wide && styles.gridWide]}>
        {snapshot.rewards.map((reward) => (
          <Pressable
            accessibilityLabel={`Edit ${reward.title}`}
            accessibilityRole="button"
            key={reward.id}
            style={({ pressed }) => [
              styles.rewardCard,
              wide && styles.rewardCardWide,
              { backgroundColor: reward.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
            <View style={styles.rewardCopy}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardType}>{reward.type.replaceAll("_", " ")}</Text>
            </View>
            <Text style={styles.rewardCost}>{reward.pointCost} ★</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  decisionButton: {
    minHeight: 44,
  },
  emptyCard: {
    marginBottom: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pressed: {
    opacity: 0.8,
  },
  requestCard: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  requestCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  requestMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 3,
    textTransform: "capitalize",
  },
  requestTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  rewardCard: {
    alignItems: "center",
    borderRadius: radii.lg,
    flexDirection: "row",
    minHeight: 112,
    padding: spacing.lg,
  },
  rewardCardWide: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  rewardCopy: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  rewardCost: {
    color: colors.purpleDark,
    fontSize: 16,
    fontWeight: "900",
  },
  rewardEmoji: {
    fontSize: 38,
  },
  rewardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  rewardType: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 4,
    textTransform: "capitalize",
  },
});
