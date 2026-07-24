# Fovari

Fovari is a private, age-adaptive family rewards app. Parents create clear goals, children submit
their work, adults approve it, and an immutable ledger turns effort into family-chosen rewards.

This repository is a local Release 1 foundation. It uses synthetic Rivera-family data by default,
does not require credentials, and does not connect to a production service.

## What works

- Parent Family, Calendar, Add, Rewards, and Insights experiences.
- Child Home, Goals, Rewards, Calendar, Profile, and Victory Vault experiences.
- Explorer, Adventurer, Independence, and Launch presentation rules.
- Goal creation, completion submission, approval, one-time star credit, reward selection, redemption
  debit, approval, fulfillment, and refund logic.
- Append-only ledger, stable command idempotency keys, offline-safe command queue, and adult gate.
- Responsive phone/tablet/web layouts and a shared-device kiosk route.
- Supabase migrations for family-scoped identity, goals, completion, points, rewards, privacy,
  audit, consent, devices, integrations, and mock subscription entitlements.
- RLS and pgTAP tests for tenant isolation, immutable history, approval idempotency, and
  redemptions.

## Prerequisites

- Node.js 22+
- pnpm 11.9.0
- Optional for the database: Supabase CLI 2.106+ and Docker Desktop or another Docker-compatible
  container runtime
- Optional for Android: Android Studio, SDK, and an emulator
- iOS native builds require macOS and Xcode

## Run the app

```powershell
pnpm install --frozen-lockfile
pnpm --filter @fovari/mobile web
```

Open the local URL printed by Expo. You can:

- Choose **Create a family account** to complete the seven-step local setup. The setup is saved on
  this device, resumes after a refresh, and opens the parent dashboard when complete.
- Choose **Explore the family demo** to load the synthetic Rivera family.
- Choose **Continue with ...** when this browser already has a saved family.

Use synthetic names and PINs only. A child PIN in this local build protects the shared-device
handoff; it is not production authentication and must not be reused as a real password or account
credential. The PIN is stored only through the local repository's derived verifier, not as raw setup
text.

Creating a new family or opening the demo after setup asks before replacing the family saved in the
browser. Confirming that prompt resets the local family; dismissing it keeps the current family.
Stopping and restarting the Expo process does not itself erase browser storage. Clear the site's
local storage when you intentionally need a completely fresh device.

Other app commands:

```powershell
pnpm --filter @fovari/mobile start
pnpm --filter @fovari/mobile android
pnpm verify
```

## Run the local database

Keep the stack bound to the local machine and never expose it to an external network.

```powershell
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint
```

The checked-in `.env.example` contains public local placeholders only. Never put a Supabase
`service_role` key in an `EXPO_PUBLIC_*` variable or in a client bundle.

## Architecture

The mobile app calls a repository port. The default local adapter executes deterministic domain
transactions in memory; the connected adapter boundary is backed by Supabase RPCs and RLS. Pure
business rules live in `packages/domain`, validation in `packages/validation`, contracts in
`packages/api-client`, and presentation tokens in `packages/design-system`.

See [system overview](docs/architecture/system-overview.md),
[test strategy](docs/testing/test-strategy.md), [security model](SECURITY.md), and
[local release evidence](docs/testing/local-release-1-evidence.md). The focused
[family setup and identity evidence](docs/testing/family-setup-identity-evidence.md) records the
synthetic shared-device journey.

## Release boundary

No deployment, app-store submission, real messaging, real billing, production account, or real child
data is included. Store, legal, device, local-Supabase, and final accessibility evidence must be
completed before a public release. See [RELEASE.md](RELEASE.md).
