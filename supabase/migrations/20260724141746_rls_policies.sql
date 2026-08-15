do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'families',
    'family_memberships',
    'child_profiles',
    'child_adult_relationships',
    'family_invitations',
    'goal_templates',
    'goals',
    'goal_assignments',
    'goal_schedules',
    'goal_occurrences',
    'goal_checklist_items',
    'completions',
    'completion_evidence',
    'completion_approvals',
    'point_accounts',
    'point_transactions',
    'rewards',
    'reward_eligibility',
    'child_reward_goals',
    'reward_redemptions',
    'redemption_events',
    'achievements',
    'calendar_events',
    'audit_events',
    'consent_records',
    'data_requests',
    'device_sessions',
    'notification_preferences',
    'integration_connections',
    'family_subscriptions'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('revoke all on public.%I from authenticated', table_name);
  end loop;
end;
$$;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.families to authenticated;
grant select, insert, update on public.family_memberships to authenticated;
grant select, insert, update on public.child_profiles to authenticated;
grant select, insert, update on public.child_adult_relationships to authenticated;
grant select, insert, update on public.family_invitations to authenticated;
grant select, insert, update on public.goal_templates to authenticated;
grant select, insert, update on public.goals to authenticated;
grant select, insert, update on public.goal_assignments to authenticated;
grant select, insert, update on public.goal_schedules to authenticated;
grant select, insert, update on public.goal_occurrences to authenticated;
grant select, insert, update on public.goal_checklist_items to authenticated;
grant select, insert on public.completions to authenticated;
grant select, insert on public.completion_evidence to authenticated;
grant select on public.completion_approvals to authenticated;
grant select on public.point_accounts to authenticated;
grant select on public.point_transactions to authenticated;
grant select, insert, update on public.rewards to authenticated;
grant select, insert, update on public.reward_eligibility to authenticated;
grant select, insert, update on public.child_reward_goals to authenticated;
grant select on public.reward_redemptions to authenticated;
grant select on public.redemption_events to authenticated;
grant select on public.achievements to authenticated;
grant select, insert, update on public.calendar_events to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert on public.consent_records to authenticated;
grant select, insert on public.data_requests to authenticated;
grant select on public.device_sessions to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update on public.integration_connections to authenticated;
grant select on public.family_subscriptions to authenticated;

create or replace function private.is_child_self(p_family_id uuid, p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.child_profiles child
    where child.family_id = p_family_id
      and child.id = p_child_id
      and child.auth_profile_id = (select auth.uid())
      and child.is_active
      and child.deleted_at is null
  );
$$;

revoke all on function private.is_child_self(uuid, uuid) from public;
grant execute on function private.is_child_self(uuid, uuid) to authenticated;

create policy "profiles read own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles create own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles update own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "families read as member"
on public.families for select
to authenticated
using (private.is_family_member(id));

create policy "families create as self"
on public.families for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "families update by manager"
on public.families for update
to authenticated
using (private.has_family_permission(id, 'manage_family'))
with check (private.has_family_permission(id, 'manage_family'));

create policy "memberships read in family"
on public.family_memberships for select
to authenticated
using (private.is_family_member(family_id));

create policy "memberships create initial or managed"
on public.family_memberships for insert
to authenticated
with check (
  (
    profile_id = (select auth.uid())
    and role = 'family_owner'
    and exists (
      select 1
      from public.families family
      where family.id = family_id
        and family.created_by = (select auth.uid())
    )
  )
  or private.has_family_permission(family_id, 'manage_family')
);

create policy "memberships update by manager"
on public.family_memberships for update
to authenticated
using (private.has_family_permission(family_id, 'manage_family'))
with check (private.has_family_permission(family_id, 'manage_family'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'child_profiles',
    'child_adult_relationships',
    'family_invitations',
    'goal_templates',
    'goals',
    'goal_assignments',
    'goal_schedules',
    'goal_occurrences',
    'goal_checklist_items',
    'completions',
    'completion_evidence',
    'completion_approvals',
    'point_accounts',
    'point_transactions',
    'rewards',
    'reward_eligibility',
    'child_reward_goals',
    'reward_redemptions',
    'redemption_events',
    'achievements',
    'calendar_events',
    'audit_events',
    'consent_records',
    'data_requests',
    'device_sessions',
    'notification_preferences',
    'integration_connections',
    'family_subscriptions'
  ]
  loop
    execute format(
      'create policy "family scoped read" on public.%I for select to authenticated using (private.is_family_member(family_id))',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'child_profiles',
    'child_adult_relationships',
    'family_invitations',
    'goal_templates',
    'goals',
    'goal_assignments',
    'goal_schedules',
    'goal_checklist_items',
    'rewards',
    'reward_eligibility',
    'calendar_events',
    'notification_preferences'
  ]
  loop
    execute format(
      'create policy "adult managed insert" on public.%I for insert to authenticated with check (private.has_family_permission(family_id, %L))',
      table_name,
      'manage_family'
    );
    execute format(
      'create policy "adult managed update" on public.%I for update to authenticated using (private.has_family_permission(family_id, %L)) with check (private.has_family_permission(family_id, %L))',
      table_name,
      'manage_family',
      'manage_family'
    );
  end loop;
end;
$$;

create policy "occurrences insert by goal manager"
on public.goal_occurrences for insert
to authenticated
with check (private.has_family_permission(family_id, 'manage_goals'));

create policy "occurrences update by goal manager"
on public.goal_occurrences for update
to authenticated
using (private.has_family_permission(family_id, 'manage_goals'))
with check (private.has_family_permission(family_id, 'manage_goals'));

create policy "completions submit self or adult"
on public.completions for insert
to authenticated
with check (
  private.is_child_self(family_id, child_id)
  or private.has_family_permission(family_id, 'manage_goals')
);

create policy "completion evidence submit self or adult"
on public.completion_evidence for insert
to authenticated
with check (
  exists (
    select 1
    from public.completions completion
    where completion.id = completion_id
      and completion.family_id = family_id
      and (
        private.is_child_self(completion.family_id, completion.child_id)
        or private.has_family_permission(completion.family_id, 'manage_goals')
      )
  )
);

create policy "reward goal select self or adult"
on public.child_reward_goals for insert
to authenticated
with check (
  private.is_child_self(family_id, child_id)
  or private.has_family_permission(family_id, 'manage_rewards')
);

create policy "reward goal update self or adult"
on public.child_reward_goals for update
to authenticated
using (
  private.is_child_self(family_id, child_id)
  or private.has_family_permission(family_id, 'manage_rewards')
)
with check (
  private.is_child_self(family_id, child_id)
  or private.has_family_permission(family_id, 'manage_rewards')
);

create policy "consent append by self"
on public.consent_records for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and private.is_family_member(family_id)
);

create policy "data request create by member"
on public.data_requests for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and private.is_family_member(family_id)
);

create policy "integration create by owner"
on public.integration_connections for insert
to authenticated
with check (private.has_family_permission(family_id, 'manage_integrations'));

create policy "integration update by owner"
on public.integration_connections for update
to authenticated
using (private.has_family_permission(family_id, 'manage_integrations'))
with check (private.has_family_permission(family_id, 'manage_integrations'));

-- Intentionally no client INSERT, UPDATE, or DELETE policies exist for point
-- accounts, point transactions, approvals, redemptions, audit events, or
-- subscription entitlements. Those records change only through reviewed RPCs
-- or a separately secured server-side billing reconciler.
