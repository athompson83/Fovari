# Family setup and identity evidence

- Date: 2026-07-24
- Branch: `codex/fovari-functional-mvp`
- Starting commit: `5908c2b10db5a0c7becc578b7f52aa3eb1e9b906`
- Runtime: local Expo web at `http://127.0.0.1:8090`
- Data: synthetic Morgan, The Park Family, Maya, and PIN `2468`

The final Task 8 commit is the commit carrying this evidence file. Its exact SHA is recorded in the
local Task 8 report and completion handoff because a commit cannot contain its own SHA.

## Automated gate

`pnpm verify` passed after the implementation and evidence changes:

- formatting, lint, and strict type checking passed;
- 214 tests passed in 30 files;
- Expo exported 66 static web routes.

Focused regression coverage proves that:

- onboarding can resume from a valid persisted step without retaining the raw child PIN;
- the first onboarding step can persist before family and child details exist;
- the parent dashboard uses the active adult and family identities;
- a signed-out parent route redirects directly to the shared-device profile picker;
- web replacement actions use an explicit browser confirmation; and
- Expo serves the configured PNG favicon.

## Phone: 390x844

Playwright CLI created a fresh family through all seven setup steps:

1. Morgan was entered as the adult.
2. The Park Family, Stars, and `America/New_York` were selected.
3. Maya was added at the Explorer stage with synthetic PIN `2468`.
4. **Read together** and **Family movie night** were selected.
5. The review screen was completed and **Create my family** opened Morgan's dashboard.

The dashboard displayed Morgan, The Park Family, and Maya rather than demo identities. Hand-off
opened Maya's profile picker. PIN `0000` produced **That PIN does not match. 2 tries left.**; PIN
`2468` opened Maya's home with the selected goal and reward. A page refresh preserved Maya's child
session. The adult gate accepted the synthetic answer `12`, returned to Morgan's dashboard, and a
second hand-off returned directly to the profile picker. The welcome route then offered **Continue
with The Park Family**. Dismissing the start-over confirmation kept the saved family.

The final phone state produced 0 browser errors and 0 browser warnings. Representative ignored
artifacts:

- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-07-28-163Z.png` — setup review
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-07-49-209Z.png` — Morgan dashboard
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-10-03-858Z.png` — wrong PIN feedback
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-10-20-209Z.png` — Maya child home
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-11-00-204Z.png` — parent-gate return
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-11-28-720Z.png` — returning-family
  affordance

## Tablet: 1180x820

At normal scale, `document.documentElement.scrollWidth` equaled `clientWidth` at 1180 pixels.
Keyboard-only Tab and Enter traversal selected Maya, focused the labeled **Maya PIN** input, focused
the **Open Maya's space** button, and opened the child home.

Chromium's browser zoom shortcut did not change the headless viewport, so the same page was
explicitly evaluated with `document.documentElement.style.zoom = "1.25"`. This is page-level
large-text/zoom evidence, not an operating-system accessibility claim. At 125%:

- the child home and PIN unlock remained readable and actionable;
- the final **Create my family** button remained fully visible with a bottom edge of 749.75 pixels;
- `scrollWidth` still equaled `clientWidth` at 1180 pixels; and
- the setup completion opened Morgan's dashboard.

The final tablet session produced 0 browser errors and 0 browser warnings. Representative ignored
artifacts:

- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-11-58-473Z.png` — dashboard at
  1180x820
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-12-53-670Z.png` — keyboard-reached
  child home
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-13-39-140Z.png` — child home at 125%
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-14-48-188Z.png` — PIN unlock at 125%
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-20-59-612Z.png` — setup review at 125%
- `output/playwright/task8/.playwright-cli/page-2026-07-24T20-21-05-133Z.png` — completed dashboard
  at 125%

## Environment and release boundary

Android, iOS, and Docker-backed Supabase targets were not observed in this workspace session and
were not claimed as passing. No GitHub, deployment, production account, real child identity,
production authentication, billing, messaging, or external service action was used. The PIN and
adult-gate values above are synthetic local test inputs only.
