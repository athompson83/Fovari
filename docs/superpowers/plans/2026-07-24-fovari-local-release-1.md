# Fovari Local Release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable, native-quality Fovari app that proves the complete
parent-to-child goal, point, and reward loop on phone and tablet while preserving production-grade
domain, database, security, privacy, and release boundaries.

**Architecture:** A strict TypeScript pnpm/Turborepo monorepo separates framework-free domain rules
from the Expo Router mobile app and Supabase persistence. The mobile app consumes a repository
contract with deterministic local and Supabase adapters; only server/database transactions may award
points or debit rewards.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript 6.0, Zustand,
TanStack Query, React Hook Form, Zod, Supabase/PostgreSQL, Vitest, Jest, React Native Testing
Library, Maestro, pnpm, and Turborepo.

## Global Constraints

- Work only in `C:\Users\Adam\Documents\Fovari`; do not deploy, spend money, send real messages,
  process real payments, or use real child data.
- Use `Fovari` as the working name and `com.fovari.mobile.dev` only as the local development
  identifier.
- Keep public social features, ads, child purchases, public leaderboards, unrestricted browsing,
  open child AI chat, and precise location tracking absent.
- Keep all production credentials and Supabase service-role credentials out of client code and Git.
- Write each behavior test first, run it to observe the expected failure, implement minimally, and
  rerun the focused and full suites.
- Treat live local-Supabase evidence as a separate gate; Docker absence must not be disguised as a
  passing database run.

---

### Task 1: Monorepo foundation and test harness

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `prettier.config.mjs`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.config.ts`
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Test: `packages/domain/src/foundation.test.ts`

**Interfaces:**

- Produces: workspace scripts `format:check`, `lint`, `typecheck`, `test`, `build`, and `verify`;
  strict `@fovari/domain` package compilation.

- [ ] Write `foundation.test.ts` importing `@fovari/domain` and asserting its exported
      `FOVARI_DOMAIN_VERSION` equals `1`.
- [ ] Run `pnpm --filter @fovari/domain test` and observe module/export failure.
- [ ] Add the workspace configs and minimal `packages/domain/src/index.ts` export.
- [ ] Run install, the focused test, typecheck, and `pnpm verify`.
- [ ] Commit the independently working foundation.

### Task 2: Pure family, goal, point, and reward domain

**Files:**

- Create: `packages/domain/src/family/types.ts`
- Create: `packages/domain/src/family/age-mode.ts`
- Create: `packages/domain/src/family/permissions.ts`
- Create: `packages/domain/src/goals/types.ts`
- Create: `packages/domain/src/goals/occurrence.ts`
- Create: `packages/domain/src/points/ledger.ts`
- Create: `packages/domain/src/rewards/redemption.ts`
- Create: `packages/domain/src/shared/result.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/family/age-mode.test.ts`
- Test: `packages/domain/src/family/permissions.test.ts`
- Test: `packages/domain/src/goals/occurrence.test.ts`
- Test: `packages/domain/src/points/ledger.test.ts`
- Test: `packages/domain/src/rewards/redemption.test.ts`

**Interfaces:**

- Produces: `resolveExperienceMode(age, override)`, `can(permission, actor)`,
  `generateDailyOccurrences(input)`, `reducePointLedger(transactions)`, and
  `requestRedemption(input): Result<RedemptionDecision, DomainError>`.

- [ ] Write failing tests for all four age bands and parent override.
- [ ] Run the focused age-mode test and observe missing implementation failure.
- [ ] Implement `resolveExperienceMode` and rerun green.
- [ ] Repeat red-green for deny-by-default permissions and child restrictions.
- [ ] Repeat red-green for idempotent occurrence keys across a rolling window.
- [ ] Repeat red-green for append-only point balance, duplicate idempotency keys, and reversal
      entries.
- [ ] Repeat red-green for cost snapshots, eligibility, limits, and insufficient balance.
- [ ] Run all domain tests and typecheck.
- [ ] Commit the independently working domain.

### Task 3: Validation and repository command model

**Files:**

- Create: `packages/validation/package.json`
- Create: `packages/validation/tsconfig.json`
- Create: `packages/validation/src/index.ts`
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/family-repository.ts`
- Create: `packages/api-client/src/commands.ts`
- Create: `packages/api-client/src/index.ts`
- Test: `packages/validation/src/index.test.ts`
- Test: `packages/api-client/src/contracts.test.ts`

**Interfaces:**

- Produces: Zod schemas `CreateFamilySchema`, `CreateChildSchema`, `CreateGoalSchema`,
  `SubmitCompletionSchema`, and `RequestRedemptionSchema`; `FamilyRepository` query/command contract
  with stable idempotency keys.

- [ ] Write failing validation tests for trimmed required text, UUIDs, point bounds, child
      assignments, and evidence metadata.
- [ ] Run tests and observe missing schema failures.
- [ ] Implement the schemas and rerun green.
- [ ] Write contract tests that prove every state-changing command requires an actor, family, and
      idempotency key.
- [ ] Add the repository and command types; rerun green and typecheck.
- [ ] Commit the independently working contracts.

### Task 4: Local family repository and offline queue

**Files:**

- Create: `apps/mobile/src/data/fixtures.ts`
- Create: `apps/mobile/src/data/local-family-repository.ts`
- Create: `apps/mobile/src/data/offline-queue.ts`
- Create: `apps/mobile/src/store/family-store.ts`
- Test: `apps/mobile/src/data/local-family-repository.test.ts`
- Test: `apps/mobile/src/data/offline-queue.test.ts`

**Interfaces:**

- Consumes: `FamilyRepository`, validation schemas, domain ledger/redemption functions.
- Produces: deterministic `createLocalFamilyRepository(seed)` and persisted `enqueue`,
  `markSyncing`, `markRetryable`, `markComplete`, `listPending`.

- [ ] Write a failing repository test for submit -> approve -> one ledger credit -> duplicate
      approve rejection.
- [ ] Run it and observe the missing repository failure.
- [ ] Implement the minimum in-memory transaction reducer and rerun green.
- [ ] Write failing tests for reward request, approval, debit, fulfillment, refund reversal, and
      overdraft rejection.
- [ ] Implement those transitions and rerun green.
- [ ] Write failing offline queue tests for duplicate client keys, retry counts, permanent failures,
      and revoked actors.
- [ ] Implement the queue and a Zustand adapter; rerun green.
- [ ] Run mobile data tests, full tests, and typecheck.
- [ ] Commit the independently working local data layer.

### Task 5: Design system and responsive application shell

**Files:**

- Create: `packages/design-system/package.json`
- Create: `packages/design-system/tsconfig.json`
- Create: `packages/design-system/src/tokens.ts`
- Create: `packages/design-system/src/age-modes.ts`
- Create: `packages/design-system/src/index.ts`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/src/components/AppShell.tsx`
- Create: `apps/mobile/src/components/FovariLogo.tsx`
- Create: `apps/mobile/src/components/Screen.tsx`
- Create: `apps/mobile/src/components/Card.tsx`
- Create: `apps/mobile/src/components/Button.tsx`
- Create: `apps/mobile/src/components/ProgressBar.tsx`
- Create: `apps/mobile/src/providers/AppProviders.tsx`
- Test: `apps/mobile/src/components/AppShell.test.tsx`

**Interfaces:**

- Produces: accessible primitives, four presentation token sets, width-aware `Screen`, explicit role
  switcher, and Expo Router root shell.

- [ ] Write a failing rendered test for the welcome screen’s name, promise, demo entry, and
      legal/support affordances.
- [ ] Run it and observe missing component/route failure.
- [ ] Implement the providers, tokens, primitives, welcome route, and safe-area shell.
- [ ] Rerun rendered tests at phone and tablet widths.
- [ ] Run accessibility assertions, lint, and typecheck.
- [ ] Commit the independently working shell.

### Task 6: Parent experience

**Files:**

- Create: `apps/mobile/app/(parent)/_layout.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/family.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/calendar.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/add.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/rewards.tsx`
- Create: `apps/mobile/app/(parent)/(tabs)/insights.tsx`
- Create: `apps/mobile/app/(parent)/approvals.tsx`
- Create: `apps/mobile/app/(parent)/approval/[completionId].tsx`
- Create: `apps/mobile/app/(parent)/goal/new.tsx`
- Create: `apps/mobile/app/(parent)/reward/new.tsx`
- Create: `apps/mobile/src/features/parent/*.tsx`
- Test: `apps/mobile/src/features/parent/parent-flow.test.tsx`

**Interfaces:**

- Consumes: store queries/commands and shared primitives.
- Produces: parent navigation, under-15-second family dashboard, quick add, multi-step goal/reward
  builders, approval, ledger, calendar, and insights.

- [ ] Write failing rendered tests for child summary cards, pending approval count, and prominent
      Add action.
- [ ] Implement the parent tabs and responsive dashboard; rerun green.
- [ ] Write failing tests for validated goal/reward creation review steps.
- [ ] Implement forms with React Hook Form/Zod; rerun green.
- [ ] Write failing approval tests asserting displayed evidence, resulting points, and duplicate
      protection.
- [ ] Implement approval and ledger views; rerun green.
- [ ] Run parent flow, full tests, lint, and typecheck.
- [ ] Commit the independently working parent experience.

### Task 7: Child age-adaptive experience

**Files:**

- Create: `apps/mobile/app/(child)/_layout.tsx`
- Create: `apps/mobile/app/(child)/select-profile.tsx`
- Create: `apps/mobile/app/(child)/unlock.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/home.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/goals.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/rewards.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/calendar.tsx`
- Create: `apps/mobile/app/(child)/(tabs)/profile.tsx`
- Create: `apps/mobile/app/(child)/goal/[occurrenceId].tsx`
- Create: `apps/mobile/app/(child)/timer/[occurrenceId].tsx`
- Create: `apps/mobile/app/(child)/victory-vault.tsx`
- Create: `apps/mobile/src/features/child/*.tsx`
- Test: `apps/mobile/src/features/child/child-flow.test.tsx`

**Interfaces:**

- Produces: profile handoff/unlock, five child destinations, four visual modes, completion
  submission, saved timer, reward selection/request, and Victory Vault.

- [ ] Write failing tests that each age mode keeps the same destinations but changes density,
      terminology, and presentation.
- [ ] Implement child routing and age adapters; rerun green.
- [ ] Write failing tests for goal detail -> timer/attestation -> submission -> pending state.
- [ ] Implement the child goal flow and offline queued state; rerun green.
- [ ] Write failing tests for chosen reward progress, eligible rewards, and request confirmation.
- [ ] Implement rewards, calendar, profile, and Victory Vault; rerun green.
- [ ] Run child flow, full tests, lint, and typecheck.
- [ ] Commit the independently working child experience.

### Task 8: Parent gate, kiosk, privacy, and entitlements

**Files:**

- Create: `apps/mobile/src/features/security/ParentGate.tsx`
- Create: `apps/mobile/app/(kiosk)/index.tsx`
- Create: `apps/mobile/app/(parent)/settings/privacy.tsx`
- Create: `apps/mobile/app/(parent)/settings/subscription.tsx`
- Create: `apps/mobile/src/features/privacy/PrivacyCenter.tsx`
- Create: `apps/mobile/src/features/billing/mock-entitlements.ts`
- Test: `apps/mobile/src/features/security/ParentGate.test.tsx`
- Test: `apps/mobile/src/features/privacy/PrivacyCenter.test.tsx`

**Interfaces:**

- Produces: rate-limited adult challenge adapter, tablet kiosk split view, consent/export/deletion
  request UI, mock entitlement checks, adult-only paywall.

- [ ] Write failing tests proving a child cannot dismiss the gate with a single confirmation or
      access billing/privacy actions.
- [ ] Implement the gate, lockout, and audited role transition; rerun green.
- [ ] Write failing tests for explicit export/deletion request state and restore-purchase mock
      behavior.
- [ ] Implement privacy center and mock entitlements; rerun green.
- [ ] Implement and render-test kiosk portrait/landscape split layouts.
- [ ] Run security/privacy tests, full tests, lint, and typecheck.
- [ ] Commit the independently working protected surfaces.

### Task 9: Supabase schema, atomic functions, RLS, and seeds

**Files:**

- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260724000100_core.sql`
- Create: `supabase/migrations/20260724000200_goals_points_rewards.sql`
- Create: `supabase/migrations/20260724000300_privacy_billing.sql`
- Create: `supabase/migrations/20260724000400_functions.sql`
- Create: `supabase/migrations/20260724000500_rls.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/tests/rls.sql`
- Create: `supabase/tests/ledger.sql`
- Create: `packages/api-client/src/supabase-family-repository.ts`

**Interfaces:**

- Produces: family-scoped tables, append-only ledger, `approve_completion`, `request_redemption`,
  `refund_redemption`, RLS helpers/policies, synthetic fixtures.

- [ ] Write pgTAP tests for cross-family denial, child scope, ledger immutability, duplicate
      approval, and overdraft.
- [ ] Run `supabase db reset` and observe expected missing migration/function failures when Docker
      is available; otherwise record the Docker prerequisite.
- [ ] Add ordered migrations and transactional functions.
- [ ] Add RLS policies and synthetic seed data.
- [ ] Implement the Supabase repository adapter without service-role credentials.
- [ ] Run migration lint/static parse and, when Docker is available, reset plus pgTAP.
- [ ] Run secret scan, tests, and typecheck.
- [ ] Commit the independently reviewable database layer.

### Task 10: Documentation, CI, and full local verification

**Files:**

- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `PRIVACY_ENGINEERING.md`
- Create: `RELEASE.md`
- Create: `.github/workflows/ci.yml`
- Create: `docs/architecture/system-overview.md`
- Create: `docs/security/threat-model.md`
- Create: `docs/security/authorization-matrix.md`
- Create: `docs/security/rls-policy-matrix.md`
- Create: `docs/privacy/data-inventory.md`
- Create: `docs/privacy/deletion-design.md`
- Create: `docs/testing/test-strategy.md`
- Create: `docs/testing/local-release-1-evidence.md`
- Create: `docs/app-store/app-review-checklist.md`
- Create: `docs/play-store/play-review-checklist.md`
- Create: `docs/runbooks/restore-database.md`
- Create: `maestro/core-loop.yaml`

**Interfaces:**

- Produces: exact local setup, environment registry, decision-ready blockers, CI gates, one-command
  verification, and executable core-loop browser/device QA.

- [ ] Add documentation and CI commands matching actual repository scripts.
- [ ] Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm audit`, `npx expo-doctor`, secret scan, and SBOM generation.
- [ ] Start Expo Web and execute the complete parent/child core loop at phone and tablet viewport
      sizes.
- [ ] Build/run Android locally when an emulator or device is available; record iOS as requiring
      macOS/Xcode.
- [ ] Inspect all results, fix failures immediately, and rerun the complete verification gate.
- [ ] Record exact results, known defects, Docker/iOS/store/legal blockers, and the next phase in
      the evidence document.
- [ ] Commit the verified local Release 1 handoff.

## Self-review

- Spec coverage: Tasks 1-10 cover the Release 1 core loop, all four age modes, phone/tablet/kiosk,
  offline-safe submission, database/RLS, privacy, billing abstraction, documentation, and
  verification. Optional provider integrations remain intentionally feature-flagged.
- Placeholder scan: production-only legal identifiers, pricing, accounts, and provider credentials
  are explicit owner decisions rather than implementation placeholders.
- Type consistency: all state-changing UI work consumes the `FamilyRepository` command contract;
  points and rewards consume only domain functions or atomic database commands; the local and
  Supabase adapters expose the same interface.
