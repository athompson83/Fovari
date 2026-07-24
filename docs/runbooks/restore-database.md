# Database restore runbook

## Local rebuild

`supabase db reset --local` is destructive to the local database. Confirm the target is the
disposable local project before running:

```powershell
supabase status
supabase db reset --local
supabase db test --local supabase/tests
supabase db lint --local --schema public --level error --fail-on error
```

## Production design gate

Before production, document and rehearse:

1. Named incident commander and database owner.
2. Recovery point and recovery time objectives.
3. PITR/backup inventory, encryption, retention, and access.
4. Clean replacement environment and credential rotation.
5. Restore to a non-production target.
6. Schema/migration history validation.
7. Row counts, membership isolation, ledger/account reconciliation, and object-storage integrity.
8. Application canary using a synthetic family.
9. Decision and communication path for cutover or rollback.
10. Evidence retention and post-incident review.

Never test a destructive reset against a linked production project.
