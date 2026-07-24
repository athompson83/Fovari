# Data inventory

| Category       | Examples                                                   | Purpose                    | Local Release 1 |
| -------------- | ---------------------------------------------------------- | -------------------------- | --------------- |
| Adult identity | Auth ID, display name, locale, timezone                    | Account and authorization  | Synthetic only  |
| Child profile  | Display name, mode, avatar, optional birth year            | Age-adaptive experience    | Synthetic only  |
| Family graph   | Membership, relationship, explicit permissions             | Household access           | Synthetic only  |
| Goals          | Instructions, schedule, assignments, checklist             | Family routine             | Synthetic only  |
| Completion     | Status, bounded note, duration, optional evidence metadata | Review and recognition     | Synthetic only  |
| Points         | Account projection and immutable transactions              | Earn/spend history         | Synthetic only  |
| Rewards        | Catalog, eligibility, chosen target, redemption status     | Family reward loop         | Synthetic only  |
| Recognition    | Achievements and streaks                                   | Permanent positive history | Synthetic only  |
| Calendar       | Fovari-created events and participants                     | Household planning         | Synthetic only  |
| Device/session | Pseudonymous device ID, expiry, revocation                 | Secure access              | Schema only     |
| Privacy        | Consent and data requests                                  | Rights workflow            | Schema only     |
| Audit          | Actor, action, entity, bounded metadata                    | Security/accountability    | Schema only     |
| Integration    | Provider, scopes, credential reference                     | Optional adapters          | Disabled        |
| Subscription   | Tier/status/provider references                            | Server entitlement         | Mock only       |

Forbidden by product policy: public child profiles, ad targeting, precise location history, child
payment credentials, open child chat, stranger messaging, and health/weight-loss profiling.
