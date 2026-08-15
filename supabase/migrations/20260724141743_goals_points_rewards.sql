create type public.goal_type as enum (
  'one_time',
  'recurring',
  'habit',
  'timed_session',
  'quantity_target',
  'grade_target',
  'checklist',
  'challenge'
);

create type public.occurrence_status as enum (
  'scheduled',
  'available',
  'submitted',
  'approved',
  'rejected',
  'skipped',
  'excused',
  'expired',
  'cancelled'
);

create type public.completion_status as enum (
  'submitted',
  'approved',
  'needs_changes',
  'rejected'
);

create type public.point_transaction_type as enum (
  'goal_reward',
  'bonus',
  'adjustment',
  'redemption',
  'refund',
  'reversal',
  'expiration'
);

create type public.reward_type as enum (
  'experience',
  'privilege',
  'physical_item',
  'savings_goal',
  'custom'
);

create type public.redemption_status as enum (
  'requested',
  'approved',
  'scheduled',
  'fulfilled',
  'rejected',
  'refunded',
  'cancelled'
);

create table public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  instructions text check (char_length(instructions) <= 2000),
  category text not null,
  goal_type public.goal_type not null,
  default_point_value integer not null default 0 check (default_point_value between 0 and 1000000),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  template_id uuid references public.goal_templates (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  instructions text check (char_length(instructions) <= 2000),
  category text not null,
  goal_type public.goal_type not null,
  approval_required boolean not null default true,
  point_value integer not null default 0 check (point_value between 0 and 1000000),
  starts_on date not null default current_date,
  ends_on date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_on is null or ends_on >= starts_on),
  unique (family_id, id)
);

create table public.goal_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (goal_id, child_id),
  unique (family_id, id)
);

create table public.goal_schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  timezone text not null,
  recurrence_rule text not null check (char_length(recurrence_rule) <= 500),
  local_time time,
  created_at timestamptz not null default now(),
  unique (goal_id)
);

create table public.goal_occurrences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  assignment_id uuid not null references public.goal_assignments (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  scheduled_for timestamptz not null,
  due_at timestamptz,
  point_value integer not null check (point_value between 0 and 1000000),
  status public.occurrence_status not null default 'scheduled',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, idempotency_key),
  unique (family_id, id)
);

create table public.goal_checklist_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  position smallint not null check (position >= 0),
  label text not null check (char_length(trim(label)) between 1 and 240),
  required boolean not null default true,
  unique (goal_id, position)
);

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  occurrence_id uuid not null references public.goal_occurrences (id),
  child_id uuid not null references public.child_profiles (id),
  status public.completion_status not null default 'submitted',
  child_note text check (char_length(child_note) <= 1000),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  client_idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (family_id, client_idempotency_key),
  unique (occurrence_id)
);

create table public.completion_evidence (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  completion_id uuid not null references public.completions (id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/heic')),
  size_bytes integer not null check (size_bytes between 1 and 10000000),
  created_at timestamptz not null default now(),
  unique (completion_id, storage_path)
);

create table public.completion_approvals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  completion_id uuid not null references public.completions (id),
  decided_by uuid not null references public.profiles (id),
  decision public.completion_status not null check (decision <> 'submitted'),
  points_awarded integer check (points_awarded between 0 and 1000000),
  parent_note text check (char_length(parent_note) <= 1000),
  idempotency_key text not null,
  decided_at timestamptz not null default now(),
  unique (completion_id),
  unique (family_id, idempotency_key)
);

create table public.point_accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (family_id, child_id),
  unique (family_id, id)
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  account_id uuid not null references public.point_accounts (id),
  child_id uuid not null references public.child_profiles (id),
  amount bigint not null check (amount <> 0),
  transaction_type public.point_transaction_type not null,
  description text not null check (char_length(trim(description)) between 1 and 240),
  source_completion_id uuid references public.completions (id),
  source_redemption_id uuid,
  reverses_transaction_id uuid references public.point_transactions (id),
  idempotency_key text not null,
  created_by uuid references public.profiles (id),
  occurred_at timestamptz not null default now(),
  unique (family_id, idempotency_key)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  reward_type public.reward_type not null,
  point_cost integer not null check (point_cost between 0 and 1000000),
  emoji text,
  accent text,
  max_redemptions_per_child integer check (max_redemptions_per_child > 0),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (family_id, id)
);

create table public.reward_eligibility (
  reward_id uuid not null references public.rewards (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  primary key (reward_id, child_id)
);

create table public.child_reward_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  selected_at timestamptz not null default now(),
  unique (family_id, child_id)
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id),
  reward_id uuid not null references public.rewards (id),
  snapshot_title text not null,
  snapshot_point_cost integer not null check (snapshot_point_cost between 0 and 1000000),
  status public.redemption_status not null default 'requested',
  client_idempotency_key text not null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  fulfilled_at timestamptz,
  unique (family_id, client_idempotency_key),
  unique (family_id, id)
);

alter table public.point_transactions
  add constraint point_transactions_source_redemption_fk
  foreign key (source_redemption_id) references public.reward_redemptions (id);

create table public.redemption_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  redemption_id uuid not null references public.reward_redemptions (id) on delete cascade,
  from_status public.redemption_status,
  to_status public.redemption_status not null,
  actor_profile_id uuid references public.profiles (id),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null check (char_length(description) <= 1000),
  emoji text,
  earned_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.child_profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null,
  source text not null default 'fovari',
  external_metadata jsonb,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index goal_occurrences_child_due_idx
  on public.goal_occurrences (child_id, scheduled_for)
  where status in ('scheduled', 'available', 'submitted');
create index completions_family_status_idx
  on public.completions (family_id, status, submitted_at desc);
create index point_transactions_account_time_idx
  on public.point_transactions (account_id, occurred_at desc);
create index reward_redemptions_family_status_idx
  on public.reward_redemptions (family_id, status, requested_at desc);
create index calendar_events_family_start_idx
  on public.calendar_events (family_id, starts_at);

create trigger goal_templates_set_updated_at
before update on public.goal_templates
for each row execute function public.set_updated_at();
create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();
create trigger goal_occurrences_set_updated_at
before update on public.goal_occurrences
for each row execute function public.set_updated_at();
create trigger point_accounts_set_updated_at
before update on public.point_accounts
for each row execute function public.set_updated_at();
create trigger rewards_set_updated_at
before update on public.rewards
for each row execute function public.set_updated_at();
