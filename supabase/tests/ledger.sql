begin;
select plan(7);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select *
    from public.approve_completion(
      '33000000-0000-4000-8000-000000000004',
      'test-approve-june',
      null,
      'Nice cleanup!'
    )
  $$,
  'authorized parent approves a pending completion'
);
select is(
  (
    select balance
    from public.point_accounts
    where child_id = '20000000-0000-4000-8000-000000000002'
  ),
  40::bigint,
  'approval credits exact occurrence points'
);
select is(
  (
    select count(*)::integer
    from public.point_transactions
    where idempotency_key = 'test-approve-june'
  ),
  1,
  'approval appends one transaction'
);
select lives_ok(
  $$
    select *
    from public.approve_completion(
      '33000000-0000-4000-8000-000000000004',
      'test-approve-june',
      null,
      'Retry'
    )
  $$,
  'same approval key is idempotent'
);
select is(
  (
    select count(*)::integer
    from public.point_transactions
    where idempotency_key = 'test-approve-june'
  ),
  1,
  'approval retry does not duplicate points'
);
select lives_ok(
  $$
    select *
    from public.request_redemption(
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'test-alex-movie'
    )
  $$,
  'funded eligible reward request succeeds'
);
select is(
  (
    select balance
    from public.point_accounts
    where child_id = '20000000-0000-4000-8000-000000000001'
  ),
  140::bigint,
  'reward request debits snapshotted cost once'
);

select * from finish();
rollback;
