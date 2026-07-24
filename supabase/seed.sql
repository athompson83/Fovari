-- Synthetic local-only identities. Never reuse these values outside a disposable
-- local Supabase stack.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'jamie.rivera@fovari.local',
    extensions.crypt('local-only-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000099',
    'authenticated',
    'authenticated',
    'taylor.other@fovari.local',
    extensions.crypt('local-only-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, display_name, timezone)
values
  ('10000000-0000-4000-8000-000000000002', 'Jamie Rivera', 'America/New_York'),
  ('10000000-0000-4000-8000-000000000099', 'Taylor Other', 'America/Chicago')
on conflict (id) do nothing;

insert into public.families (id, name, timezone, points_name, created_by)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'The Rivera Family',
    'America/New_York',
    'Stars',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '10000000-0000-4000-8000-000000000098',
    'Isolation Test Family',
    'America/Chicago',
    'Stars',
    '10000000-0000-4000-8000-000000000099'
  )
on conflict (id) do nothing;

insert into public.family_memberships (family_id, profile_id, role)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'family_owner'
  ),
  (
    '10000000-0000-4000-8000-000000000098',
    '10000000-0000-4000-8000-000000000099',
    'family_owner'
  )
on conflict (family_id, profile_id) do nothing;

insert into public.child_profiles (
  id, family_id, display_name, birth_year, experience_mode, avatar_key
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Alex',
    2017,
    'adventurer',
    'alex'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'June',
    2020,
    'explorer',
    'june'
  ),
  (
    '20000000-0000-4000-8000-000000000099',
    '10000000-0000-4000-8000-000000000098',
    'Isolation Child',
    2016,
    'adventurer',
    'isolation'
  )
on conflict (id) do nothing;

insert into public.child_adult_relationships (
  family_id, child_id, adult_profile_id, relationship_label,
  can_approve, can_manage_goals, can_manage_rewards
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'parent',
    true,
    true,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'parent',
    true,
    true,
    true
  )
on conflict (family_id, child_id, adult_profile_id) do nothing;

insert into public.goals (
  id, family_id, title, instructions, category, goal_type, point_value, created_by
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Read for 20 minutes',
    'Read any parent-approved book for at least 20 minutes.',
    'reading',
    'timed_session',
    15,
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Finish homework',
    'Complete your math worksheet and pack it for tomorrow.',
    'school',
    'one_time',
    20,
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'Put toys away',
    'Put every toy in its home.',
    'chores',
    'one_time',
    5,
    '10000000-0000-4000-8000-000000000002'
  )
on conflict (id) do nothing;

insert into public.goal_assignments (id, family_id, goal_id, child_id, assigned_by)
values
  (
    '31000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '31000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002'
  )
on conflict (goal_id, child_id) do nothing;

insert into public.goal_occurrences (
  id, family_id, assignment_id, child_id, scheduled_for, due_at,
  point_value, status, idempotency_key
)
values
  (
    '32000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '2026-07-24 16:00:00-04',
    '2026-07-24 19:00:00-04',
    15,
    'available',
    'alex-reading-2026-07-24'
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '2026-07-24 16:00:00-04',
    '2026-07-24 20:00:00-04',
    20,
    'available',
    'alex-homework-2026-07-24'
  ),
  (
    '32000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '31000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    '2026-07-24 14:00:00-04',
    '2026-07-24 17:30:00-04',
    5,
    'submitted',
    'june-toys-2026-07-24'
  )
on conflict (id) do nothing;

insert into public.completions (
  id, family_id, occurrence_id, child_id, child_note, client_idempotency_key
)
values (
  '33000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000002',
  'All my toys are in the bin!',
  'seed-june-toys-completion'
)
on conflict (id) do nothing;

insert into public.point_accounts (id, family_id, child_id, balance)
values
  (
    '34000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    240
  ),
  (
    '34000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    35
  )
on conflict (family_id, child_id) do nothing;

insert into public.point_transactions (
  id, family_id, account_id, child_id, amount, transaction_type,
  description, idempotency_key, created_by
)
values
  (
    '35000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    240,
    'adjustment',
    'Synthetic opening balance',
    'seed-alex-opening',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '35000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    35,
    'adjustment',
    'Synthetic opening balance',
    'seed-june-opening',
    '10000000-0000-4000-8000-000000000002'
  )
on conflict (id) do nothing;

insert into public.rewards (
  id, family_id, title, reward_type, point_cost, emoji, accent, created_by
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Family movie night',
    'experience',
    100,
    '🍿',
    '#FFF2CC',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'New headphones',
    'physical_item',
    320,
    '🎧',
    '#E9E5FF',
    '10000000-0000-4000-8000-000000000002'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Ice cream date',
    'experience',
    75,
    '🍦',
    '#DDF8F0',
    '10000000-0000-4000-8000-000000000002'
  )
on conflict (id) do nothing;

insert into public.child_reward_goals (family_id, child_id, reward_id)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001'
  )
on conflict (family_id, child_id) do nothing;

insert into public.achievements (family_id, child_id, title, description, emoji, earned_on)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Reading Champion',
    'Read five days in a row',
    '📚',
    '2026-07-23'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'Super Helper',
    'Helped the whole family',
    '💛',
    '2026-07-22'
  );

insert into public.calendar_events (
  family_id, child_id, title, starts_at, ends_at, timezone
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Reading time',
    '2026-07-24 16:00:00-04',
    '2026-07-24 16:20:00-04',
    'America/New_York'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    null,
    'Family dinner',
    '2026-07-24 18:00:00-04',
    '2026-07-24 19:00:00-04',
    'America/New_York'
  );

insert into public.family_subscriptions (family_id, tier, status, provider)
values
  ('10000000-0000-4000-8000-000000000001', 'free', 'active', 'local_mock'),
  ('10000000-0000-4000-8000-000000000098', 'free', 'active', 'local_mock')
on conflict (family_id) do nothing;
