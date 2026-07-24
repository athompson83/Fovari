import type { FamilyRole } from "@fovari/domain";

type SubscriptionTier = "family_plus" | "family_premium" | "free";

const tierLimits = {
  family_plus: { insights: true, maxChildren: 8 },
  family_premium: { insights: true, maxChildren: 20 },
  free: { insights: false, maxChildren: 2 },
} as const;

export function resolveMockEntitlements(tier: SubscriptionTier, role: FamilyRole) {
  return {
    canManageSubscription: role !== "child",
    externalBillingEnabled: false,
    isSynthetic: true,
    tier,
    ...tierLimits[tier],
  };
}
