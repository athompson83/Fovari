create extension if not exists pgcrypto with schema extensions;

create type public.family_role as enum (
  'family_owner',
  'parent',
  'guardian',
  'caregiver'
);

create type public.experience_mode as enum (
  'explorer',
  'adventurer',
  'independence',
  'launch'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  timezone text not null default 'UTC',
  points_name text not null default 'Stars' check (char_length(trim(points_name)) between 1 and 24),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null,
  status public.membership_status not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  auth_profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  birth_year smallint check (birth_year between 1900 and 2200),
  experience_mode public.experience_mode not null,
  avatar_key text not null default 'default',
  pin_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (family_id, id)
);

create table public.child_adult_relationships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.child_profiles (id) on delete cascade,
  adult_profile_id uuid not null references public.profiles (id) on delete cascade,
  relationship_label text not null default 'caregiver',
  can_approve boolean not null default false,
  can_manage_goals boolean not null default false,
  can_manage_rewards boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, child_id, adult_profile_id)
);

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email_hash text not null,
  token_hash text not null unique,
  role public.family_role not null,
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index family_memberships_profile_active_idx
  on public.family_memberships (profile_id, family_id)
  where status = 'active';
create index child_profiles_family_active_idx
  on public.child_profiles (family_id, id)
  where deleted_at is null and is_active;
create index child_adult_relationships_adult_idx
  on public.child_adult_relationships (adult_profile_id, family_id, child_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger families_set_updated_at
before update on public.families
for each row execute function public.set_updated_at();

create trigger family_memberships_set_updated_at
before update on public.family_memberships
for each row execute function public.set_updated_at();

create trigger child_profiles_set_updated_at
before update on public.child_profiles
for each row execute function public.set_updated_at();
