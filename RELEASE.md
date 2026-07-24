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

Then exercise the synthetic family setup and identity journey on phone-sized and tablet-sized
viewports:

1. Start from an empty browser profile and create Morgan's synthetic family.
2. Add Maya with the Explorer stage and a synthetic `2468` PIN.
3. Add the **Read together** starter goal and **Family movie night** reward.
4. Review the setup and confirm **Create my family** is reachable at normal and 125% browser zoom.
5. Hand off to Maya and verify `0000` is rejected before `2468` opens the child home.
6. Refresh the child home and confirm the Maya session and family remain available.
7. Pass the adult gate with the synthetic answer `12`, return to Morgan's dashboard, and hand off
   again.
8. Return to the welcome screen and verify the saved-family continuation is offered.
9. Attempt to start over, dismiss the replacement confirmation, and confirm the saved family is
   unchanged.
10. Check keyboard-only traversal, horizontal overflow, and browser errors/warnings at 390x844 and
    1180x820.

Use only synthetic names and PINs. This local shared-device identity model is not a claim of
production authentication, account recovery, or remote session security. See the
[focused evidence ledger](docs/testing/family-setup-identity-evidence.md).

The broader synthetic points/reward core loop remains a separate release gate:

1. Submit a ready child goal.
2. Pass the adult gate.
3. Approve the completion and confirm one ledger credit.
4. Request an affordable reward, approve it, and confirm one debit.
5. Restart offline and confirm safe queued commands retry once.

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
