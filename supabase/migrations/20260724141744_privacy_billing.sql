create type public.data_request_type as enum ('access', 'export', 'correction', 'deletion');
create type public.data_request_status as enum (
  'requested',
  'identity_verification',
  'in_progress',
  'completed',
  'rejected',
  'cancelled'
);
create type public.subscription_tier as enum ('free', 'family_plus', 'family_premium');
create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired'
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families (id) on delete set null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_child_id uuid references public.child_profiles (id) on delete set null,
  action text not null check (char_length(trim(action)) between 1 and 120),
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  consent_type text not null,
  policy_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (family_id, profile_id, consent_type, policy_version, recorded_at)
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  request_type public.data_request_type not null,
  status public.data_request_status not null default 'requested',
  scope jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 2000)
);

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  child_id uuid references public.child_profiles (id) on delete cascade,
  device_public_id text not null,
  session_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check ((profile_id is null) <> (child_id is null))
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  approvals_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  achievements_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null,
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  provider text not null,
  status text not null check (status in ('disabled', 'pending', 'active', 'error', 'revoked')),
  credential_reference text,
  scopes text[] not null default '{}',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (family_id, provider)
);

create table public.family_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'active',
  provider text not null default 'local_mock',
  provider_customer_reference text,
  provider_subscription_reference text,
  current_period_ends_at timestamptz,
  entitlement_version bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique (family_id)
);

create index audit_events_family_time_idx
  on public.audit_events (family_id, occurred_at desc);
create index data_requests_family_status_idx
  on public.data_requests (family_id, status, requested_at);
create index device_sessions_family_active_idx
  on public.device_sessions (family_id, expires_at)
  where revoked_at is null;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();
create trigger integration_connections_set_updated_at
before update on public.integration_connections
for each row execute function public.set_updated_at();
create trigger family_subscriptions_set_updated_at
before update on public.family_subscriptions
for each row execute function public.set_updated_at();
