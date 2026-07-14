# Lock-up / Vesting Module

**Status: design only, not yet implemented.**

A compliance module implementing the shared `is_transfer_allowed(from, to,
amount) -> bool` interface: restricts how much of an investor's balance can
move before a lock-up period ends, then linearly (or per a configured
schedule) unlocks over a vesting period.

## Design notes

- This module needs to know the *transferable* amount, which requires
  knowing the sender's total balance — but `is_transfer_allowed` as currently
  specified only receives `amount`, not the sender's balance. Resolve this
  before implementing: either extend the shared interface to pass balance,
  or have this module query `compliant_token`'s `balance()` directly (which
  would give it a compile-time dependency on the token contract, unlike
  `jurisdiction_allowlist`'s current zero-dependency design — a real
  trade-off to record in `docs/RFC.md` before writing code).
- Vesting schedule shape: cliff + linear, or fully custom per-investor
  schedule? Start with cliff + linear; it covers the common case.

## Interface to implement

`initialize(admin)`, `set_schedule(admin, investor, cliff_ledger,
vesting_end_ledger, total_amount)`, `transferable_amount(investor, held_amount)
-> i128`, `is_transfer_allowed(from, to, amount) -> bool`.
