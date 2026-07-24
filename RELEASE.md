# Release

## Local Release 1 gate

Run:

```powershell
pnpm install --frozen-lockfile
pnpm verify
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint
```

Then exercise the synthetic core loop on a phone-sized viewport and tablet-sized viewport:

1. Enter the family demo.
2. Hand off to Alex.
3. Submit a ready goal.
4. Pass the adult gate.
5. Approve the completion and confirm one ledger credit.
6. Request an affordable reward, approve it, and confirm one debit.
7. Restart offline and confirm safe queued commands retry once.

## Production stop conditions

Do not release when tenant isolation, ledger idempotency, rollback, deletion, session revocation,
evidence privacy, or a child/adult authorization boundary is unproven.

## Owner-required external gates

- Final company, support, privacy, and security contact details
- Legal documents and child/privacy review
- Apple and Google developer accounts, identifiers, signing, age rating, and store declarations
- Production Supabase region, keys, PITR/backup policy, monitoring, and recovery drill
- Real billing products and sandbox purchase/restore evidence
- Notification credentials and consent-safe copy
- Physical iOS/Android phone and tablet testing
- Independent accessibility, privacy, and security review

No production deployment is authorized by this repository.
