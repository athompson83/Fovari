# Local Release 1 evidence

- Date: 2026-07-24
- Branch: `codex/fovari-functional-mvp`
- Task 8 starting commit: `5908c2b10db5a0c7becc578b7f52aa3eb1e9b906`
- Tested application commit: `b7f2780e606ebe47799ffad42fd12077382a9c8b`
- Data: synthetic Rivera demo plus synthetic Morgan/Park/Maya setup

The later evidence-only commit carrying this ledger does not change application behavior. The
automated remediation evidence is bound to the exact tested application commit above. Historical
setup/identity browser evidence remains bound to application commit
`b3700fad4ece607a5851c57131c49476536bc3a2` and was not rerun for this final remediation.

## Automated evidence

| Gate                | Command / environment  | Current disposition                           |
| ------------------- | ---------------------- | --------------------------------------------- |
| Formatting          | `pnpm format:check`    | Passed                                        |
| Lint                | `pnpm lint`            | Passed                                        |
| Strict types        | `pnpm typecheck`       | Passed                                        |
| Unit/rendered tests | `pnpm test`            | Passed: 235 tests in 33 files                 |
| Expo web bundle     | `pnpm build`           | Passed: 66 static routes                      |
| Full local gate     | `pnpm verify`          | Passed                                        |
| Browser phone       | Playwright at 390x844  | Historical pass at `b3700fa`; not rerun       |
| Browser tablet      | Playwright at 1180x820 | Historical pass at `b3700fa`; not rerun       |
| Database start      | `supabase start`       | Not run: Docker availability was not observed |
| Database reset      | `pnpm db:reset`        | Not run: Docker availability was not observed |
| RLS/ledger pgTAP    | `pnpm db:test`         | Not run: Docker availability was not observed |
| Database lint       | `pnpm db:lint`         | Not run: Docker availability was not observed |
| Native Android      | Emulator/device        | Not run: an Android target was not observed   |
| Native iOS          | Simulator/device       | Not run: an iOS target was not observed       |

Update this ledger only with observed results. Do not translate an unavailable prerequisite into a
passing status.

## Scope evidence

- Parent and child rendered behavior tests exercise the high-information home surfaces.
- Repository tests execute the complete local points/reward transitions and partial onboarding
  persistence.
- RLS tests include a second family and assert it is invisible; the local database suite was not
  rerun for this checkpoint.
- The adult gate test proves three-attempt lockout and post-lockout recovery.
- Local-envelope tests reject unknown fields at the envelope, snapshot, child, and onboarding-child
  boundaries and reject nested PIN, passcode, password, secret, credential, and auth-code variants
  on both read and write while preserving bounded PIN metadata.
- Root rendered tests cover malformed and unsupported local envelopes, web/native cancellation,
  confirmed recovery, and visible recovery failure. Vault tests prove managed credentials and the
  durable credential journal are removed before a clean reseed.
- The child goal route test proves an active Maya session cannot render a sibling child's goal title
  or instructions when given the sibling occurrence identifier.
- The project contains no production URL, service-role key, real child data, billing product, or
  deployment configuration.
- Browser QA created the synthetic Morgan/Park/Maya family, rejected a wrong PIN, accepted the
  synthetic PIN, restored the child session after refresh, passed the parent gate, and returned to
  the shared-device profile picker.
- Browser QA verified keyboard traversal and no horizontal overflow at 1180x820. CSS page zoom
  `1.25` was only a supplemental layout check, not genuine browser/native scaling certification.
- Local browser screenshots are retained under ignored `output/playwright/task8/` artifacts.

Detailed artifact names and journey results are in the
[family setup and identity evidence](family-setup-identity-evidence.md).

## Remaining environment gates

- Native Android emulator and physical Android evidence
- iOS simulator/physical device evidence on macOS
- Local Supabase reset/RLS/ledger/lint evidence after a Docker-compatible runtime is available
- Genuine 125% browser zoom and native text-scaling evidence
- Screen-reader, switch-control, reduced-motion, and contrast review
- Independent security/privacy review and recovery drill
