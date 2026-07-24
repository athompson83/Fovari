# Fovari Family Rewards App Design

## Status and authority

This document consolidates the user-supplied master build prompt, database
architecture, product plan, wireframes, and visual reference under the final
working product name **Fovari**. Those source documents explicitly select the
technical direction and authorize autonomous local implementation. This
document therefore records the approved local design rather than reopening
settled product decisions.

Development is local-only. No production resource, paid account, real message,
real payment, store submission, or real child data is permitted.

## Product promise

Fovari helps a family set expectations once, make the next action obvious to a
child, recognize effort, and turn earned progress into parent-approved rewards.
The primary loop is:

1. A parent creates or assigns a goal.
2. A child completes or submits it.
3. An authorized adult approves it.
4. Fovari appends an immutable point transaction.
5. The child advances toward or requests a reward.
6. An authorized adult approves and fulfills the reward.
7. Achievements remain visible after points are spent.

The local release succeeds when this loop works from onboarding through
redemption on phone and tablet, with synthetic data, offline-safe submission,
role separation, and traceable state changes.

## Scope

### Local Release 1

Release 1 includes:

- Adult welcome, local demo sign-in, and guided family onboarding.
- Family creation and parent-managed child profiles.
- Explorer, Adventurer, Independence, and Launch presentation modes.
- Parent Family, Calendar, Add, Rewards, and Insights destinations.
- Child Home, Goals, Rewards, Calendar, and Profile destinations.
- One-time, recurring, timed, quantity, and checklist goals.
- Completion submission, optional evidence metadata, pending approval, and
  batch approval.
- An immutable per-child point ledger with idempotent awards.
- Reward catalog, chosen reward, request, approval, scheduling, fulfillment,
  and immutable debit/refund records.
- Badges, streaks, encouragement, and Victory Vault history.
- Local notification preferences and quiet hours.
- Offline completion queue with stable client-generated idempotency keys.
- Tablet split layouts and a synthetic kiosk experience protected by a parent
  gate.
- Privacy center, export/deletion request records, device sessions, and
  consent/integration settings.
- Mock subscription entitlements and an adult-only paywall boundary.
- Local Supabase migrations, seed data, RLS policy definitions, database
  functions, and pgTAP-ready tests.
- Documentation for security, privacy, stores, testing, release, and local
  operations.

### Feature-flagged extension points

Calendar providers, HealthKit, Health Connect, education providers, commerce,
AI parent assistance, and direct store billing remain disabled adapters. They
must not be required for the core loop to operate.

### Explicit non-goals

No public child profiles, public social graph, strangers, direct child
messaging, public leaderboards, targeted advertising, loot boxes, child
purchases, unrestricted external browsing, open-ended child AI chat, precise
location history, weight-loss goals, real store transactions, or production
deployments.

## Chosen architecture

### Option assessment

The supplied product plan considers React Native/Expo, Flutter, and separate
Swift/Kotlin clients. Fovari uses **React Native with Expo development builds**
because it provides one native-quality iOS/Android/tablet codebase, supports a
later web administration portal, and preserves native module escape hatches.
Flutter would add a second ecosystem without a product benefit, while separate
native clients would double implementation and validation cost before the
family loop is proven.

### Repository

Fovari is a strict TypeScript pnpm/Turborepo monorepo:

```text
apps/mobile          Expo Router application
apps/web             reserved family administration surface
apps/admin           reserved support surface
apps/workers         background-job boundaries
packages/domain      framework-free business rules
packages/design-system shared tokens and primitives
packages/validation shared Zod schemas
packages/api-client command/query interfaces
packages/testing     synthetic fixtures and test helpers
supabase             local config, migrations, functions, seeds, tests
docs                 product, architecture, security, privacy, and runbooks
```

Dependency direction is one-way: apps may depend on packages; domain code does
not depend on React, Expo, Supabase, or UI code. Authorization is never encoded
only in hidden controls.

### Current local stack

- Expo SDK 55, React Native 0.83, React 19, Expo Router, TypeScript strict mode.
- React Hook Form and Zod for forms and validation.
- TanStack Query for remote server state when the Supabase adapter is active.
- Zustand for selected role/child, drafts, and the local demo/offline queue.
- Supabase/PostgreSQL with migrations, row-level security, transactional
  functions, private storage policies, and synthetic seed data.
- Vitest for pure TypeScript packages, Jest/React Native Testing Library for
  rendered mobile behavior, and Maestro-ready end-to-end flows.

The app uses a repository port. `LocalFamilyRepository` supplies a deterministic
synthetic family so the UI is runnable without credentials. `SupabaseFamilyRepository`
implements the same command/query contract when local Supabase is available.
This is not a fake completion claim: local demo behavior and live database
behavior have separate evidence gates.

## Domain boundaries

### Identity and authorization

Adults authenticate through Supabase Auth in connected mode. Younger children
use parent-created profiles and device-bound child sessions. The local demo
provides only synthetic sessions. Parent/guardian/caregiver permissions are
calculated by a pure policy module and repeated in database RLS policies.

The parental gate uses an adult secret challenge or device authentication
adapter; a child-facing “OK” button is never sufficient.

### Goals and occurrences

A template describes reusable goal content. A goal is family configuration. An
assignment targets a child. A schedule stores an RFC 5545 rule and timezone. A
rolling, idempotent generator creates occurrences. A completion records a
child submission. An approval records an authorized adult decision.

### Points

Every child has a separate account. Point transactions are append-only.
Balances are reduced from the ledger and may also be stored as a verified
projection. An approval idempotency key prevents duplicate awards. Corrections
and refunds append reversal transactions; historical rows are not edited.
Negative balances are disallowed.

### Rewards

Rewards snapshot their point cost when requested. Redemption requests lock and
validate the point account, eligibility, limits, and balance in one transaction.
The point debit is created at the configured approval boundary and is
idempotent. Achievements are independent of spendable balances.

### Offline commands

The device may cache reads and queue only safe writes: completion submission,
checklist responses, evidence metadata, timer state, notes, and chosen reward.
It may not finalize point awards or reward debits offline. Queue entries contain
an id, command type, entity, client-generated idempotency key, payload, creation
time, attempt count, retry state, and last error.

## Mobile experience

### Brand

The brand name is **Fovari**. The visual language takes the supplied reference
as direction, not as a pixel-copy: deep indigo, bright blue, warm yellow, mint,
coral, and lavender on calm off-white surfaces; friendly rounded cards; crisp
system typography; expressive but restrained progress visuals; and a star/spark
motif. Copy is supportive and never guilt-based.

### Shared shell

The app starts on a branded welcome screen and offers a local synthetic family
demo. A role switcher makes parent-to-child handoff explicit. Parent and child
experiences use distinct navigation labels and never leak adult controls into a
child route.

### Parent experience

The parent Family screen communicates household status in under 15 seconds:
child cards, pending approvals, current reward progress, upcoming goals, and
recent victories. Add is the central action. Creation flows use progressive
forms with safe defaults and a review step. Approval and reward requests always
show the child, source action, points, resulting balance, and audit consequence.

### Child experience

The child shell always exposes Home, Goals, Rewards, Calendar, and Profile.
Explorer uses very large targets, minimal text, simple “I did it” actions, and
voice-instruction affordances. Adventurer uses maps, badges, levels, and simple
points. Independence uses a calm personal dashboard and longer-term planning.
Launch uses a mature productivity/financial-literacy presentation. All modes
share the same domain actions and security boundaries.

### Responsive behavior

Phone layouts use single-column cards and bottom navigation. At 768 logical
pixels and above, dashboard and detail content use two columns. Kiosk mode uses
a profile rail plus family schedule/progress panels. Landscape must not merely
stretch phone cards.

### Accessibility

Core controls have accessible names, roles, state, hints, and at least 44 by 44
logical-pixel targets. Layouts support system text scaling and do not encode
status by color alone. Motion is optional and reduced-motion aware. Explorer
instructions expose a speech adapter. Focus order follows visual order.

## Data flow

```text
Screen intent
  -> validated command
  -> repository port
  -> local demo reducer OR Supabase transaction
  -> append audit/domain events
  -> invalidate query/projection
  -> render confirmed or queued state
```

Errors are typed as validation, authorization, conflict, unavailable, or
unexpected. Forms preserve input after recoverable failures. Offline-safe
commands become visibly queued. Security or authorization failures never fall
back to a more permissive operation.

## Security and privacy

- Deny by default and family-scope every owned record.
- Use database RLS plus transactional permission checks.
- Never ship a service-role key in any client bundle.
- Hash invitation tokens and child PIN material.
- Rate-limit child PIN attempts and revoke device sessions.
- Keep evidence in private storage with short, configurable retention.
- Store no real child data in local seed fixtures.
- Keep analytics first-party, minimal, and free of raw goal text, school,
  health, photos, advertising identifiers, replay, and heatmaps.
- Model consent, export, correction, restriction, and deletion as auditable
  operations.
- Keep legal compliance and store acceptance as legal/owner review decisions,
  never engineering claims.

## Testing and evidence

Every domain behavior follows red-green-refactor. Required automated evidence:

- Unit tests for age mode, permissions, recurrence, points, rewards, streaks,
  notification limits, validation, and entitlements.
- Store/repository tests for completion approval idempotency, offline replay,
  redemption overdraft prevention, and immutable history.
- Database tests for family isolation, child isolation, ledger immutability,
  concurrent approval/redemption, and revocation.
- Rendered tests for onboarding, role switching, goal completion, approval,
  point update, reward request, parent gate, empty/error/offline states.
- Typecheck, lint, formatting, dependency/secret checks, Expo diagnostics, web
  export, and Android development build validation where the local toolchain
  permits.
- Visual review at small phone, large phone, tablet portrait, and tablet
  landscape widths for all four age modes.

Evidence must distinguish deterministic local-demo validation from tests
against a running local Supabase instance.

## Environment decisions and blockers

- Local development identifier: `com.fovari.mobile.dev`.
- Production bundle/application identifiers remain owner decisions.
- Product pricing, legal entity, legal text, Kids Category selection, store
  accounts, billing products, and production providers remain owner/legal
  decisions.
- Docker is currently unavailable on this Windows machine, so starting local
  Supabase and executing its database/RLS tests requires Docker Desktop or a
  compatible container runtime. Authoring and static inspection continue
  without weakening the database design.

## Acceptance

The local Release 1 vertical slice is accepted only when a synthetic first-time
parent can create a family and child, create a recurring goal and reward, hand
off to the child, submit the goal, approve it, observe one point award, request
a reward, approve/fulfill it, and inspect the immutable histories—with no dead
ends and with a simulated offline submission path.

