# Local Release 1 evidence

- Date: 2026-07-24
- Branch: `codex/fovari-functional-mvp`
- Task 8 starting commit: `5908c2b10db5a0c7becc578b7f52aa3eb1e9b906`
- Data: synthetic Rivera demo plus synthetic Morgan/Park/Maya setup

The final Task 8 commit is the commit carrying this evidence file. Its exact SHA is recorded in the
local Task 8 report and the completion handoff because a commit cannot contain its own SHA.

## Automated evidence

| Gate                | Command / environment  | Current disposition                              |
| ------------------- | ---------------------- | ------------------------------------------------ |
| Formatting          | `pnpm format:check`    | Passed                                           |
| Lint                | `pnpm lint`            | Passed                                           |
| Strict types        | `pnpm typecheck`       | Passed                                           |
| Unit/rendered tests | `pnpm test`            | Passed: 214 tests in 30 files                    |
| Expo web bundle     | `pnpm build`           | Passed: 66 static routes                         |
| Full local gate     | `pnpm verify`          | Passed                                           |
| Browser phone       | Playwright at 390x844  | Passed setup/identity; 0 errors and 0 warnings   |
| Browser tablet      | Playwright at 1180x820 | Passed setup/identity and 125% zoom; no overflow |
| Database start      | `supabase start`       | Not run: Docker availability was not observed    |
| Database reset      | `pnpm db:reset`        | Not run: Docker availability was not observed    |
| RLS/ledger pgTAP    | `pnpm db:test`         | Not run: Docker availability was not observed    |
| Database lint       | `pnpm db:lint`         | Not run: Docker availability was not observed    |
| Native Android      | Emulator/device        | Not run: an Android target was not observed      |
| Native iOS          | Simulator/device       | Not run: an iOS target was not observed          |

Update this ledger only with observed results. Do not translate an unavailable prerequisite into a
passing status.

## Scope evidence

- Parent and child rendered behavior tests exercise the high-information home surfaces.
- Repository tests execute the complete local points/reward transitions and partial onboarding
  persistence.
- RLS tests include a second family and assert it is invisible; the local database suite was not
  rerun for this checkpoint.
- The adult gate test proves three-attempt lockout and post-lockout recovery.
- The project contains no production URL, service-role key, real child data, billing product, or
  deployment configuration.
- Browser QA created the synthetic Morgan/Park/Maya family, rejected a wrong PIN, accepted the
  synthetic PIN, restored the child session after refresh, passed the parent gate, and returned to
  the shared-device profile picker.
- Browser QA verified keyboard traversal, 125% page zoom, and no horizontal overflow at 1180x820.
- Local browser screenshots are retained under ignored `output/playwright/task8/` artifacts.

Detailed artifact names and journey results are in the
[family setup and identity evidence](family-setup-identity-evidence.md).

## Remaining environment gates

- Native Android emulator and physical Android evidence
- iOS simulator/physical device evidence on macOS
- Local Supabase reset/RLS/ledger/lint evidence after a Docker-compatible runtime is available
- Screen-reader, switch-control, reduced-motion, and contrast review
- Independent security/privacy review and recovery drill
