# System overview

## Runtime boundary

```text
Expo Router screen
  -> Zod-validated command
  -> FamilyRepository
       -> LocalFamilyRepository (default synthetic mode)
       -> Supabase RPC/query adapter (connected mode boundary)
  -> immutable ledger/audit events
  -> refreshed FamilySnapshot
  -> Zustand presentation store
```

The UI never calculates an authoritative balance. The pure domain package evaluates permissions,
occurrence keys, ledgers, and redemption eligibility. The local repository uses those rules to
provide a deterministic no-credential application. Connected mode must make the database the
transaction authority.

## Package ownership

| Area                     | Responsibility                  | Must not depend on                 |
| ------------------------ | ------------------------------- | ---------------------------------- |
| `packages/domain`        | Pure rules and result types     | React, Expo, Supabase              |
| `packages/validation`    | External command validation     | App screens                        |
| `packages/api-client`    | Repository port and DTOs        | App state                          |
| `packages/design-system` | Tokens and age presentations    | Data layer                         |
| `apps/mobile/src/data`   | Local adapter and offline queue | Route rendering                    |
| `apps/mobile/app`        | Navigation and composition      | Database internals                 |
| `supabase`               | Persistence, RLS, atomic RPCs   | Client-only permission assumptions |

## Core transactions

Approval locks the completion, occurrence, and child account; verifies adult permission and pending
state; writes one approval and one ledger transaction; updates the balance projection; and marks the
occurrence approved. Redemption locks the reward and account, validates family, eligibility, limits,
and balance, snapshots the cost, appends one debit, and updates the balance. Both accept a unique
idempotency key.

## Offline model

Read projections may be cached. Only completion drafts, timer state, notes, checklist responses,
evidence metadata, and chosen rewards may queue offline. Awards, debits, refunds, entitlements, and
adult authorization decisions require an online transaction authority.

## Extension boundaries

Calendar, health, education, AI, commerce, billing, and notification providers are disabled
adapters. They must not become dependencies of the core family loop. Billing entitlements come from
a server projection; the checked-in resolver is explicitly synthetic.
