# Contributing

## Working agreement

1. Branch from the current integration head.
2. Keep domain rules framework-free and preserve one-way package dependencies.
3. Write a failing behavior test before changing business logic.
4. Never award points or debit rewards with multiple uncoordinated client writes.
5. Add `family_id` and RLS to every new family-owned public table.
6. Use only synthetic child data in development, tests, screenshots, and bug reports.
7. Run `pnpm verify`; for schema changes also run reset, pgTAP, and database lint.

Commits should be focused and describe behavior. Do not commit `.env`, local keys, generated native
directories, test recordings containing personal information, or Supabase temporary state.

## Definition of done

- Focused and full automated checks pass.
- Phone and tablet layouts have been inspected.
- Every new control has a useful accessible name and at least a 44-point target.
- Authorization is enforced by domain policy and database policy, not only hidden UI.
- Error, loading, empty, offline, and retry states are handled.
- Documentation and the evidence ledger reflect any remaining environment gate.
