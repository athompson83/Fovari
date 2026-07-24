import type { ChildSummary, FamilySnapshot } from "@fovari/api-client";

export function resolveAuthenticatedChild(snapshot: FamilySnapshot): ChildSummary | undefined {
  if (snapshot.session.kind !== "child") return undefined;
  const authenticatedChildId = snapshot.session.childId;
  return snapshot.children.find((child) => child.id === authenticatedChildId);
}
