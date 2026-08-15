# RLS policy matrix

All `public` tables have RLS enabled and forced. `anon` receives no table grants.

| Table family               | Read                 | Direct writes                     |
| -------------------------- | -------------------- | --------------------------------- |
| Profile                    | Own `auth.uid()`     | Own insert/update                 |
| Family and membership      | Active member        | Owner/explicit manager            |
| Child and relationships    | Active family member | Adult manager                     |
| Goal configuration         | Active family member | Goal/family manager               |
| Occurrence                 | Active family member | Goal manager/generator            |
| Completion/evidence        | Active family member | Own child session or adult        |
| Approval                   | Active family member | RPC only                          |
| Point account/transaction  | Active family member | RPC only; transaction immutable   |
| Reward catalog/eligibility | Active family member | Reward/family manager             |
| Chosen reward              | Active family member | Own child session or adult        |
| Redemption/event           | Active family member | RPC only                          |
| Achievement/calendar       | Active family member | Authorized adult/service boundary |
| Audit                      | Active family member | RPC/server only; immutable        |
| Consent                    | Active family member | Self append only; immutable       |
| Data request               | Active family member | Self create; workflow server-side |
| Device session             | Active family member | Auth/session service only         |
| Integration                | Active family member | Explicit integration manager      |
| Subscription               | Active family member | Billing reconciler only           |

Helper functions live in the unexposed `private` schema, pin an empty `search_path`, and query
membership using `auth.uid()`. Public security-definer RPCs revoke `PUBLIC` execute, grant only
`authenticated`, validate the caller inside the body, and expose only reviewed transactions.
