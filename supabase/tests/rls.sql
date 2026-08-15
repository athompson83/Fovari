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

select is((select count(*)::integer from public.families), 1, 'parent sees one family');
select is((select count(*)::integer from public.child_profiles), 2, 'parent sees own children');
select is(
  (
    select count(*)::integer
    from public.child_profiles
    where id = '20000000-0000-4000-8000-000000000099'
  ),
  0,
  'parent cannot read another family child'
);
select lives_ok(
  $$
    update public.families
    set name = 'The Rivera Family'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  'owner can update own family'
);
select is(
  (select count(*)::integer from public.point_transactions),
  2,
  'parent reads own ledger only'
);
select throws_ok(
  $$
    insert into public.point_transactions (
      family_id, account_id, child_id, amount, transaction_type,
      description, idempotency_key
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '34000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      999,
      'bonus',
      'Unauthorized direct award',
      'rls-test-direct-award'
    )
  $$,
  '42501',
  null,
  'client cannot insert ledger transaction'
);
select throws_ok(
  $$
    update public.point_transactions
    set amount = 999
    where id = '35000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'ledger history cannot be edited'
);

select * from finish();
rollback;
