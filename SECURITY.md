# Security

## Supported state

This local Release 1 foundation is not a production service. Do not provide real child data or
production credentials. Report suspected vulnerabilities privately to the future security contact;
do not include family data or secrets in an issue.

## Security invariants

- Family-owned records carry `family_id`; public tables use RLS and explicit role grants.
- Editable user metadata is never an authorization source.
- Child-facing routes contain no adult mutation authority.
- An adult gate protects the parent transition and rate-limits failed challenges.
- Point transactions, audit events, and consent history are immutable.
- Completion approval and reward redemption lock relevant rows and execute atomically.
- Stable idempotency keys prevent duplicated awards and debits.
- Balances cannot become negative.
- Service-role or secret keys are forbidden in mobile/public configuration.
- Evidence uploads are private, typed, size-limited, and require separate storage policies before
  connected mode is enabled.

## Remaining production gates

Independent penetration testing, dependency review, platform key management, server-side child
session issuance, biometric gate integration, abuse monitoring, incident contacts, backup recovery
evidence, and mobile binary analysis are required before production.

See [threat model](docs/security/threat-model.md),
[authorization matrix](docs/security/authorization-matrix.md), and
[RLS matrix](docs/security/rls-policy-matrix.md).
