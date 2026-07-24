# Threat model

## Assets

Child identity and routine data, family relationships, optional evidence, adult authorization,
sessions, immutable point history, redemption history, consent, and deletion/export requests.

## Trust boundaries

- Child-facing UI to adult controls
- Mobile/public client to Supabase Data API
- Family A to Family B
- Offline queue to confirmed server state
- Optional provider adapters to core family data
- Billing provider events to entitlement projection

## Primary threats and controls

| Threat                          | Control                                                                         | Evidence                      |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| Cross-family object access      | `family_id`, indexed membership helper, RLS on every exposed table              | `supabase/tests/rls.sql`      |
| Child invokes adult action      | Distinct actor permissions, protected route, rate-limited gate, RPC adult check | Domain and gate tests         |
| Duplicate point award           | Unique family idempotency key and locked approval transaction                   | Domain/repository/pgTAP tests |
| Balance overdraft               | Locked point account and non-negative database constraint                       | Repository/pgTAP tests        |
| Ledger tampering                | No client write grant plus immutable update/delete trigger                      | RLS test                      |
| Malicious editable JWT metadata | Membership tables and `auth.uid()` only                                         | Migration review              |
| Leaked service credential       | No service key in public env; public Expo variables documented                  | Static review                 |
| Evidence disclosure             | Private-bucket requirement, ownership policy, MIME/size bounds                  | Connected-mode gate           |
| Brute-force parent gate         | Attempt cap, timed lockout, production biometric/secret adapter boundary        | Gate test                     |
| Stale/revoked session           | Device session registry; revoke before deletion; short sensitive-session policy | Production gate               |
| Unsafe provider data flow       | Disabled-by-default adapters and consent records                                | Config/doc review             |

## Accepted local limitations

The arithmetic adult challenge is a demonstrator, not a production authenticator. The local
in-memory repository resets on restart. Docker-dependent RLS tests and binary/device security checks
remain explicit gates when the required environment is unavailable.
