import type { FamilyRole } from "./types";

export type FamilyPermission =
  | "view_progress"
  | "create_goals"
  | "approve_completions"
  | "manage_rewards"
  | "view_school_data"
  | "view_health_data"
  | "manage_integrations"
  | "manage_billing"
  | "manage_privacy";

export interface FamilyActor {
  id: string;
  role: FamilyRole;
  childId?: string;
  permissions?: Partial<Record<FamilyPermission, boolean>>;
}

const parentDefaults: Readonly<Record<FamilyPermission, boolean>> = {
  view_progress: true,
  create_goals: true,
  approve_completions: true,
  manage_rewards: true,
  view_school_data: true,
  view_health_data: false,
  manage_integrations: true,
  manage_billing: false,
  manage_privacy: true,
};

const caregiverDefaults: Readonly<Record<FamilyPermission, boolean>> = {
  view_progress: true,
  create_goals: false,
  approve_completions: false,
  manage_rewards: false,
  view_school_data: false,
  view_health_data: false,
  manage_integrations: false,
  manage_billing: false,
  manage_privacy: false,
};

export function can(permission: FamilyPermission, actor: FamilyActor): boolean {
  if (actor.role === "child") {
    return false;
  }

  if (actor.role === "family_owner") {
    return true;
  }

  const explicit = actor.permissions?.[permission];
  if (explicit !== undefined) {
    return explicit;
  }

  if (actor.role === "parent" || actor.role === "guardian") {
    return parentDefaults[permission];
  }

  return caregiverDefaults[permission];
}
