# Local Release 1 evidence

- Date: 2026-07-24
- Branch: `codex/fovari-local-release-1`
- Data: synthetic Rivera family only

## Automated evidence

| Gate                | Command / environment  | Current disposition                             |
| ------------------- | ---------------------- | ----------------------------------------------- |
| Formatting          | `pnpm format:check`    | Passed                                          |
| Lint                | `pnpm lint`            | Passed                                          |
| Strict types        | `pnpm typecheck`       | Passed                                          |
| Unit/rendered tests | `pnpm test`            | Passed: 46 tests in 17 files                    |
| Expo web bundle     | `pnpm build`           | Passed: 66 static routes                        |
| Full local gate     | `pnpm verify`          | Passed                                          |
| Browser phone       | Playwright at 390×844  | Passed core loop; no console errors or warnings |
| Browser tablet      | Playwright at 1180×820 | Passed responsive family layout                 |
| Database start      | `supabase start`       | Blocked: Docker engine pipe is absent           |
| Database reset      | `pnpm db:reset`        | Blocked by Docker prerequisite                  |
| RLS/ledger pgTAP    | `pnpm db:test`         | Blocked by Docker prerequisite                  |
| Database lint       | `pnpm db:lint`         | Blocked by Docker prerequisite                  |

Update this ledger only with observed results. Do not translate a missing prerequisite into a
passing status.

## Scope evidence

- Parent and child rendered behavior tests exercise the high-information home surfaces.
- Repository tests execute the complete local points/reward transitions.
- RLS tests include a second family and assert it is invisible.
- The adult gate test proves three-attempt lockout and post-lockout recovery.
- The project contains no production URL, service-role key, real child data, billing product, or
  deployment configuration.
- Browser QA submitted Alex's reading goal, unlocked the adult gate, approved the exact completion,
  reduced pending approvals from 2 to 1, and increased Alex's balance from 240 to 255 exactly once.
- Local browser screenshots are retained under ignored `output/playwright/` artifacts.

## Remaining environment gates

- Native Android emulator and physical Android evidence
- iOS simulator/physical device evidence on macOS
- Local Supabase reset/RLS/ledger/lint evidence after a Docker-compatible runtime is installed
- Screen-reader, switch-control, large-text, reduced-motion, and contrast review
- Independent security/privacy review and recovery drill
