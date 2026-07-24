import { describe, expect, it } from "vitest";

import { resolveMockEntitlements } from "./mock-entitlements";

describe("mock entitlements", () => {
  it("keeps purchase controls adult-only and external billing disabled", () => {
    expect(resolveMockEntitlements("free", "child")).toMatchObject({
      canManageSubscription: false,
      externalBillingEnabled: false,
    });
    expect(resolveMockEntitlements("family_plus", "family_owner")).toMatchObject({
      canManageSubscription: true,
      maxChildren: 8,
    });
  });
});
