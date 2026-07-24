create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships membership
    where membership.family_id = p_family_id
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.has_family_permission(
  p_family_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_memberships membership
    where membership.family_id = p_family_id
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('family_owner', 'parent', 'guardian')
        or coalesce((membership.permissions ->> p_permission)::boolean, false)
      )
  );
$$;

revoke all on function private.is_family_member(uuid) from public;
revoke all on function private.has_family_permission(uuid, text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_family_member(uuid) to authenticated;
grant execute on function private.has_family_permission(uuid, text) to authenticated;

create or replace function public.create_family(
  p_name text,
  p_timezone text default 'UTC',
  p_points_name text default 'Stars'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.families (name, timezone, points_name, created_by)
  values (trim(p_name), p_timezone, trim(p_points_name), v_user_id)
  returning id into v_family_id;

  insert into public.family_memberships (family_id, profile_id, role, status)
  values (v_family_id, v_user_id, 'family_owner', 'active');

  insert into public.family_subscriptions (family_id)
  values (v_family_id);

  insert into public.audit_events (family_id, actor_profile_id, action, entity_type, entity_id)
  values (v_family_id, v_user_id, 'family.created', 'family', v_family_id);

  return v_family_id;
end;
$$;

create or replace function public.approve_completion(
  p_completion_id uuid,
  p_idempotency_key text,
  p_points_override integer default null,
  p_parent_note text default null
)
returns table (
  approval_id uuid,
  transaction_id uuid,
  resulting_balance bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completion public.completions%rowtype;
  v_occurrence public.goal_occurrences%rowtype;
  v_account public.point_accounts%rowtype;
  v_approval_id uuid;
  v_transaction_id uuid;
  v_points integer;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;

  select * into v_completion
  from public.completions
  where id = p_completion_id
  for update;

  if not found then
    raise exception 'completion_not_found' using errcode = 'P0002';
  end if;
  if not private.has_family_permission(v_completion.family_id, 'approve_completions') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id
  into v_approval_id
  from public.completion_approvals
  where family_id = v_completion.family_id
    and idempotency_key = p_idempotency_key;

  if found then
    return query
      select v_approval_id, tx.id, account.balance
      from public.point_transactions tx
      join public.point_accounts account on account.id = tx.account_id
      where tx.family_id = v_completion.family_id
        and tx.idempotency_key = p_idempotency_key;
    return;
  end if;

  if v_completion.status <> 'submitted' then
    raise exception 'completion_not_pending' using errcode = '23514';
  end if;

  select * into v_occurrence
  from public.goal_occurrences
  where id = v_completion.occurrence_id
  for update;

  v_points := coalesce(p_points_override, v_occurrence.point_value);
  if v_points < 0 or v_points > 1000000 then
    raise exception 'invalid_point_award' using errcode = '22023';
  end if;

  insert into public.point_accounts (family_id, child_id)
  values (v_completion.family_id, v_completion.child_id)
  on conflict (family_id, child_id) do nothing;

  select * into v_account
  from public.point_accounts
  where family_id = v_completion.family_id
    and child_id = v_completion.child_id
  for update;

  insert into public.completion_approvals (
    family_id,
    completion_id,
    decided_by,
    decision,
    points_awarded,
    parent_note,
    idempotency_key
  )
  values (
    v_completion.family_id,
    v_completion.id,
    v_actor,
    'approved',
    v_points,
    nullif(trim(p_parent_note), ''),
    p_idempotency_key
  )
  returning id into v_approval_id;

  if v_points > 0 then
    insert into public.point_transactions (
      family_id,
      account_id,
      child_id,
      amount,
      transaction_type,
      description,
      source_completion_id,
      idempotency_key,
      created_by
    )
    values (
      v_completion.family_id,
      v_account.id,
      v_completion.child_id,
      v_points,
      'goal_reward',
      'Approved goal completion',
      v_completion.id,
      p_idempotency_key,
      v_actor
    )
    returning id into v_transaction_id;

    update public.point_accounts
    set balance = balance + v_points
    where id = v_account.id
    returning balance into resulting_balance;
  else
    resulting_balance := v_account.balance;
  end if;

  update public.completions
  set status = 'approved', reviewed_at = now()
  where id = v_completion.id;
  update public.goal_occurrences
  set status = 'approved'
  where id = v_occurrence.id;

  insert into public.audit_events (
    family_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_completion.family_id,
    v_actor,
    'completion.approved',
    'completion',
    v_completion.id,
    jsonb_build_object('points_awarded', v_points)
  );

  return query select v_approval_id, v_transaction_id, resulting_balance;
end;
$$;

create or replace function public.request_redemption(
  p_family_id uuid,
  p_child_id uuid,
  p_reward_id uuid,
  p_idempotency_key text
)
returns table (
  redemption_id uuid,
  transaction_id uuid,
  resulting_balance bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.rewards%rowtype;
  v_account public.point_accounts%rowtype;
  v_redemption_id uuid;
  v_transaction_id uuid;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not private.is_family_member(p_family_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;

  select id into v_redemption_id
  from public.reward_redemptions
  where family_id = p_family_id
    and client_idempotency_key = p_idempotency_key;

  if found then
    return query
      select v_redemption_id, tx.id, account.balance
      from public.point_transactions tx
      join public.point_accounts account on account.id = tx.account_id
      where tx.family_id = p_family_id
        and tx.idempotency_key = p_idempotency_key;
    return;
  end if;

  select * into v_reward
  from public.rewards
  where id = p_reward_id
    and family_id = p_family_id
    and is_active
    and deleted_at is null
  for share;

  if not found then
    raise exception 'reward_unavailable' using errcode = 'P0002';
  end if;
  if exists (
    select 1
    from public.reward_eligibility eligibility
    where eligibility.reward_id = p_reward_id
  ) and not exists (
    select 1
    from public.reward_eligibility eligibility
    where eligibility.reward_id = p_reward_id
      and eligibility.child_id = p_child_id
  ) then
    raise exception 'child_not_eligible' using errcode = '42501';
  end if;
  if v_reward.max_redemptions_per_child is not null and (
    select count(*)
    from public.reward_redemptions redemption
    where redemption.reward_id = p_reward_id
      and redemption.child_id = p_child_id
      and redemption.status not in ('rejected', 'refunded', 'cancelled')
  ) >= v_reward.max_redemptions_per_child then
    raise exception 'redemption_limit_reached' using errcode = '23514';
  end if;

  select * into v_account
  from public.point_accounts
  where family_id = p_family_id
    and child_id = p_child_id
  for update;

  if not found or v_account.balance < v_reward.point_cost then
    raise exception 'insufficient_points' using errcode = '23514';
  end if;

  insert into public.reward_redemptions (
    family_id,
    child_id,
    reward_id,
    snapshot_title,
    snapshot_point_cost,
    status,
    client_idempotency_key
  )
  values (
    p_family_id,
    p_child_id,
    p_reward_id,
    v_reward.title,
    v_reward.point_cost,
    'requested',
    p_idempotency_key
  )
  returning id into v_redemption_id;

  insert into public.point_transactions (
    family_id,
    account_id,
    child_id,
    amount,
    transaction_type,
    description,
    source_redemption_id,
    idempotency_key,
    created_by
  )
  values (
    p_family_id,
    v_account.id,
    p_child_id,
    -v_reward.point_cost,
    'redemption',
    'Reward request: ' || v_reward.title,
    v_redemption_id,
    p_idempotency_key,
    v_actor
  )
  returning id into v_transaction_id;

  update public.point_accounts
  set balance = balance - v_reward.point_cost
  where id = v_account.id
  returning balance into resulting_balance;

  insert into public.redemption_events (
    family_id,
    redemption_id,
    to_status,
    actor_profile_id
  )
  values (p_family_id, v_redemption_id, 'requested', v_actor);

  return query select v_redemption_id, v_transaction_id, resulting_balance;
end;
$$;

revoke all on function public.create_family(text, text, text) from public;
revoke all on function public.approve_completion(uuid, text, integer, text) from public;
revoke all on function public.request_redemption(uuid, uuid, uuid, text) from public;
grant execute on function public.create_family(text, text, text) to authenticated;
grant execute on function public.approve_completion(uuid, text, integer, text) to authenticated;
grant execute on function public.request_redemption(uuid, uuid, uuid, text) to authenticated;

create or replace function private.reject_immutable_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'immutable_record' using errcode = '42501';
end;
$$;

create trigger point_transactions_are_immutable
before update or delete on public.point_transactions
for each row execute function private.reject_immutable_change();

create trigger audit_events_are_immutable
before update or delete on public.audit_events
for each row execute function private.reject_immutable_change();

create trigger consent_records_are_immutable
before update or delete on public.consent_records
for each row execute function private.reject_immutable_change();
