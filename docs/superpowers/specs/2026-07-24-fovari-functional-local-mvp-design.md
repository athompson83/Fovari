# Fovari Functional Local MVP Design

## Status and authority

This specification extends the approved Fovari Local Release 1 design. It records the user-approved
boundary for the next local release: every Release 1 parent, child, and shared-device journey must
be functional with synthetic data, while billing, AI, health, education, commerce, and external
calendar providers remain disabled adapters.

Development remains local-only. No production service, paid resource, real payment, real message,
store submission, or real child data is authorized.

## Outcome

A family can complete the local Fovari lifecycle without encountering a decorative control or dead
end:

1. An adult creates a local account and family.
2. The adult adds one or more children, selects each experience mode, and optionally configures a
   child PIN.
3. The adult chooses starter goals and rewards or builds custom ones.
4. The child selects and unlocks their profile.
5. The child completes one-time, recurring, timed, quantity, and checklist goals.
6. The child submits notes or permitted local evidence and can queue a completion while offline.
7. An adult reviews one completion or a batch, adjusts the awarded amount, and creates exactly one
   immutable point transaction per approval.
8. The child chooses and requests a reward.
9. An adult approves, schedules, fulfills, rejects, or refunds the request with an immutable debit
   or reversal trail.
10. The family can use the calendar, notifications, encouragement, achievements, insights, privacy
    controls, mock subscription controls, and account-management workflows.
11. The app restores the synthetic family, session, preferences, and queued work after a restart.

## Scope boundary

### Included

- Guided adult setup and returning local sign-in.
- Family creation and editing.
- Multiple parent-managed child profiles.
- Explorer, Adventurer, Independence, and Launch experience selection.
- Optional child PIN with rate limiting and explicit parent recovery.
- Starter goal and reward selection.
- Goal templates and custom goals.
- One-time, recurring, timed, quantity, and checklist goals.
- Child assignment, schedules, points, verification, and evidence settings.
- Today, week, and all-goal views.
- Notes, timer results, quantity progress, checklist responses, and local evidence metadata.
- Safe offline completion queue, retry, conflict, and discard behavior.
- Individual review, batch approval, rejection, and point override.
- Manual bonus and correction transactions with required reasons.
- Reward creation, selection, limits, request, approval, scheduling, fulfillment, rejection, and
  refund.
- Editable local family events and child agenda views.
- In-app notification center, preferences, quiet hours, and supportive encouragement.
- Family celebration feed derived from audited local events.
- Child overview, progress history, weekly summary, achievements, and Victory Vault.
- Family members, local roles, device sessions, and session revocation.
- Integration consent controls that keep unavailable providers disabled.
- Data export requests, child-deletion requests, family-deletion requests, and audited request
  histories.
- Adult-only mock subscription, paywall, plan selection, and restore behavior.
- Useful empty, loading, offline, validation, authorization, conflict, and recoverable-error states.
- Versioned local persistence with a safe demo reset.

### Disabled adapters

The app may explain and configure consent for these adapters, but it must not connect to them:

- Apple Calendar, Google Calendar, and Microsoft calendar providers.
- HealthKit and Health Connect.
- School and education providers.
- Product commerce and gift-card fulfillment.
- Generative AI.
- Apple and Google store billing.
- Push-notification delivery services.

### Excluded

Public child profiles, public social features, stranger messaging, child-to-child messaging,
leaderboards, advertising, loot boxes, child purchases, unrestricted browsing, open child AI chat,
precise location tracking, weight-loss goals, real banking, and production deployment remain absent.

## Delivery approach

Implementation proceeds as vertical journeys. Each journey must leave the application in a testable,
connected state before the next begins.

### Journey 1: Family setup and identity

Replace the one-page setup preview and redirect-only child selection with a resumable onboarding
flow:

1. Local adult account.
2. Family details.
3. Child profiles and age modes.
4. Optional child PINs.
5. Starter goals.
6. Starter rewards.
7. Notification preferences.
8. Review and completion.

Returning adults enter through a local sign-in affordance. Children use a profile picker and, when
configured, a PIN. A child session can act only as its selected child. Parent recovery requires the
existing adult gate. Parent and child sessions survive a restart and can be explicitly ended.

### Journey 2: Goals, schedules, and completion

The goal builder supports a template or custom path and captures:

- Title, instructions, category, and assigned children.
- Goal type and type-specific configuration.
- One-time or recurring schedule, local timezone, start date, optional due time, and recurrence end.
- Point amount and approval mode.
- Verification and evidence requirements.
- Review before creation.

The child interaction is derived from goal type:

- One-time and recurring goals use a simple confirmation.
- Timed goals use a resumable elapsed-time session.
- Quantity goals accept bounded progress.
- Checklist goals require configured steps and retain step state.

Completion submission validates the active child, occurrence, type-specific result, and evidence
rule. Online local-demo submissions execute immediately. Simulated-offline submissions enter the
queue with a stable idempotency key and a visible status. Retry cannot create a second completion.

### Journey 3: Parent operations and family activity

Approval detail shows the child, goal, submitted result, evidence metadata, proposed points,
resulting balance, and immutable audit consequence. Adults may approve, reject, or adjust points
with a reason. Batch approval operates only on still-pending completions and reports conflicts
without duplicating awards.

Manual bonuses and corrections append ledger transactions and require a reason. Historical ledger
entries cannot be edited or deleted.

Reward requests expose the full lifecycle. The child sees cost, eligibility, limits, current
balance, and status. Adults may approve, schedule, fulfill, reject, or refund valid states. Requests
snapshot their cost. Debits and reversals are append-only and idempotent.

The local calendar supports family or child events, editing, and deletion of user-created events.
The notification center and private family feed derive entries from domain events. Adults can send
supportive preset or custom encouragement; children cannot message other users.

Insights use only local family data and explain their calculation. Weekly summaries show completion
rate, stars earned and spent, streak continuity, reward progress, and suggested parent actions
without making diagnostic, medical, or educational claims.

### Journey 4: Settings, privacy, and resilience

Settings make notification preferences, quiet hours, reduced-motion preference, family members,
child profiles, local roles, device sessions, integrations, and the synthetic subscription state
operable.

Privacy workflows create auditable local request records:

- Export family data.
- Delete a child profile.
- Delete the family account.
- Revoke an integration consent.
- Revoke a device session.

Destructive requests require the adult gate, explicit typed confirmation, and a review of affected
data. In the local MVP, export generates a local JSON representation and deletion executes only
against synthetic local data after confirmation. A fresh seed can be restored with a separate “Reset
demo family” action.

The adult-only paywall can switch among deterministic mock plans and restore the last mock
entitlement. It never invokes a store SDK, charges a payment method, or becomes reachable from a
child session without the adult gate.

## Architecture

### Repository boundary

`FamilyRepository` remains the only application mutation boundary. The interface expands through
focused command groups rather than direct snapshot mutation:

- Identity and onboarding commands.
- Goal and occurrence commands.
- Completion and queue commands.
- Approval and point commands.
- Reward and redemption commands.
- Calendar and notification commands.
- Privacy, session, consent, and mock-entitlement commands.

Every mutating command carries a family, actor, and stable idempotency key. Adult permissions are
checked in pure policy code and repeated by connected database transactions. Child commands verify
the selected child identity.

### Domain modules

Framework-free modules own:

- Onboarding state transitions.
- Child PIN hashing-adapter contracts and attempt limits.
- Goal-type configuration and completion validation.
- Recurrence and occurrence generation.
- Quiet-hour calculations.
- Offline command transitions.
- Approval and batch-decision rules.
- Manual ledger adjustment rules.
- Reward lifecycle rules.
- Privacy request state transitions.
- Mock entitlement reconciliation.

UI files format and present state but do not reproduce these rules.

### Local persistence

The local adapter stores a versioned envelope containing the family snapshot, onboarding state,
active session, preferences, offline queue, and processed idempotency keys. Persistence uses a
storage port with an AsyncStorage implementation and an in-memory implementation for tests.

Migrations are explicit pure functions from one envelope version to the next. Invalid or unsupported
data produces a recoverable reset choice; it never silently relaxes permissions or awards points.

### Offline commands

Only safe child writes may queue:

- Completion submission.
- Checklist responses.
- Quantity progress.
- Timer checkpoints.
- Child note.
- Local evidence metadata.
- Chosen reward.

Approval, point award, manual adjustment, reward debit, refund, deletion, entitlement, role, and
consent mutations require the repository to be available. Queue entries move through pending,
retrying, conflicted, failed, or applied states. Applied entries retain enough local history to
prove that retries are idempotent.

### Screen organization

Routes remain separated into public, parent, child, and kiosk groups. Reusable feature components
live beside the journey they implement. Multi-step builders use focused step components and a single
validated draft model. Parent and child route guards render an authorization state instead of
redirecting silently into a more privileged screen.

## State and data flow

```text
User intent
  -> validate draft or command
  -> verify active session and permission
  -> execute repository transaction or enqueue an allowed offline command
  -> append domain, ledger, notification, feed, and audit records
  -> persist the versioned local envelope
  -> publish the confirmed snapshot
  -> render success, queued, conflict, or typed error state
```

All balances are projections of append-only point transactions. All completion and reward state
changes preserve their prior event history. Restart restoration rehydrates one complete envelope so
the session and snapshot cannot drift apart.

## Failure handling

Repository errors use these public categories:

- `validation`: user-correctable input.
- `authorization`: actor or parent-gate failure.
- `conflict`: stale or already-processed state.
- `unavailable`: simulated offline or unavailable adapter.
- `unexpected`: invariant or programming failure.

Forms retain drafts after recoverable errors. Queue conflicts expose retry and discard choices.
Authorization failures never fall back to a parent actor. Destructive operations never partially
apply. A visible diagnostic identifier may be copied, but child names, goal text, evidence, and PIN
material are excluded from logs.

## User experience and accessibility

- Every visible action is either functional or clearly presented as an unavailable external adapter
  with an explanation.
- Empty states offer a valid next action.
- Success states state what changed and what happens next.
- Explorer uses short copy, large targets, and optional spoken-instruction controls.
- Independence and Launch modes use progressively calmer, denser layouts without changing
  permissions.
- Controls expose accessible names, roles, state, error relationships, and at least 44-by-44
  logical-pixel targets.
- Status never relies on color alone.
- Text can scale without hiding actions.
- Reduced-motion preference suppresses non-essential animation.
- Focus follows the visual and task order.

## Test design

Every behavior is implemented red-green-refactor.

### Domain tests

- Onboarding transition validity.
- PIN attempt, lockout, and recovery rules.
- All goal-type configuration and completion validation.
- Recurrence boundaries, timezone changes, and duplicate occurrence prevention.
- Quiet hours spanning midnight.
- Queue retry, conflict, discard, and idempotency behavior.
- Batch approval conflict handling.
- Manual adjustment reason and overdraft rules.
- Every reward lifecycle transition and reversal.
- Privacy request confirmation and state transitions.
- Mock entitlement restore and child-access denial.

### Repository tests

- Restart restores one consistent versioned envelope.
- Corrupt and older envelopes migrate or fail safely.
- Children cannot act for siblings.
- Offline completion retries create one completion.
- Individual and batch approval create one award per completion.
- Manual adjustments append without editing history.
- Reward requests cannot overdraft and snapshot cost.
- Calendar, notification, encouragement, consent, session, export, and deletion commands preserve
  family scope and audit history.

### Rendered journey tests

- First-time onboarding and returning local sign-in.
- Profile selection, child PIN, lockout, and parent recovery.
- Each goal type from parent creation through child submission.
- Offline queued confirmation and later retry.
- Approval detail, rejection, point override, and batch approval.
- Reward request through fulfillment and refund.
- Calendar creation and child agenda.
- Notification, feed, settings, subscription, export, and deletion flows.
- Empty, validation, unavailable, conflict, and authorization states.

### End-to-end and visual evidence

- Phone and tablet parent-to-child core flow.
- All four experience modes on small phone, large phone, tablet portrait, and tablet landscape.
- Restart/persistence flow.
- Simulated offline queue and retry.
- Adult-gate protection for settings, subscription, adjustment, and deletion.
- Console error and warning review.

`pnpm verify` remains the mandatory code gate. Docker-backed Supabase, Android emulator/device, and
iOS simulator/device evidence remain separate gates and must be reported as unavailable until their
runtimes exist.

## Delivery checkpoints

Each journey ends with:

1. Focused red-green evidence.
2. Full formatting, lint, typecheck, test, and static export.
3. Phone and tablet browser proof for changed routes.
4. Documentation and feature-matrix reconciliation.
5. A focused Git commit.

No later journey may stack on an unknown failure from an earlier journey.

## Acceptance

The functional local MVP is accepted when every included journey is reachable and produces the
documented state transition using synthetic data, survives a restart where applicable, has no
dead-end controls, and passes the available automated and browser gates. Disabled adapters must
remain non-operational, explicit, and unnecessary for the family rewards loop.
