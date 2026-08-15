# Test strategy

## Automated pyramid

- Domain tests cover age modes, permissions, occurrence determinism, immutable ledger projection,
  idempotency, reward eligibility, limits, and insufficient balances.
- Contract tests cover Zod command bounds and required actor/family/idempotency context.
- Repository tests cover submit/approve/one-credit, duplicate rejection, redemption debit,
  fulfillment/refund, and overdraft rejection.
- Offline tests cover deduplication, retryable/permanent failure, and revoked actors.
- Rendered web-adapter tests cover the welcome, parent dashboard, child home, and adult gate.
- pgTAP tests cover cross-family RLS, direct ledger denial, immutability, atomic approval, retry,
  and atomic redemption.
- Expo static export proves all routes bundle for the web target.

## Manual matrix

| Surface                    | Phone    | Tablet portrait | Tablet landscape | Web            |
| -------------------------- | -------- | --------------- | ---------------- | -------------- |
| Welcome/demo entry         | Required | Required        | Required         | Required       |
| Parent dashboard/tabs      | Required | Required        | Required         | Required       |
| Child modes                | All four | All four        | All four         | Spot check     |
| Core goal loop             | Required | Required        | Required         | Required       |
| Reward loop                | Required | Required        | Required         | Required       |
| Adult gate/kiosk           | Required | Required        | Required         | Required       |
| Dynamic text/screen reader | Required | Required        | Required         | Keyboard check |

Test offline loss, process restart, duplicated taps, revoked membership, stale state, insufficient
points, rejected completion, refunded reward, empty family, large text, reduced motion, dark mode,
and interrupted evidence upload.

## Evidence rule

Record exact commit, operating system, runtime versions, commands, outputs, viewport/device, and
known gaps. A web export does not prove native behavior. A pure repository test does not prove RLS.
An unavailable container runtime is a blocked database gate, not a pass.
