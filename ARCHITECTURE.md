# Architecture

## Overview

```
                    ┌─────────────────────────┐
                    │   compliant_token         │
                    │   (balances, transfer)    │
                    └────────────┬─────────────┘
                                 │ env.invoke_contract("is_transfer_allowed")
                                 │ for each registered module address
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
        jurisdiction_     accredited_      lockup_vesting
        allowlist         investor         (design only)
        (implemented)     (implemented)
                                 │
                                 │ on-chain events
                                 ▼
                    ┌─────────────────────────┐
                    │  backend/indexer          │  Soroban event -> Postgres
                    └────────────┬─────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  db (cap-table state)     │
                    └────────────┬─────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  backend/api              │  GraphQL/REST over cap-table + disclosure reports
                    └─────────────────────────┘
```

## Why modules are separate contracts, not compiled-in logic

`compliant_token` calls each registered module dynamically via
`env.invoke_contract`, not through a compile-time Rust trait. This means:

- New modules can be registered without redeploying the token contract.
- A module can be swapped, upgraded, or added by a different team than the
  one that deployed the token — genuinely pluggable, not just configurable.
- The trade-off: modules can't share complex typed state with the token
  contract for free (see `contracts/modules/lockup_vesting/README.md` for a
  concrete case where this trade-off actually bites, and the open design
  question it creates).

Fails closed: `check_compliance` requires every registered module to return
`true`; any `false` rejects the transfer, and a module that panics aborts
the whole transaction (Soroban's standard cross-contract semantics), which is
also fail-closed.

## Components

### `contracts/compliant_token`

Base SEP-41-shaped token: `initialize`, `mint`, `transfer`, `balance`,
`register_module`. Implemented and tested, including a real cross-contract
integration test (not a mock) against `jurisdiction_allowlist`.

### `contracts/modules/jurisdiction_allowlist`

Implemented and tested. A transfer is allowed only if both `from` and `to`
are on the module's allow-list.

### `contracts/modules/accredited_investor`

Implemented and tested (6 unit tests, including the expiry-boundary case).
Unlike `jurisdiction_allowlist`'s static flag, accreditation expires — each
investor has an expiry ledger checked at query time.

### `contracts/modules/lockup_vesting`

Design only — see its README for the specific open design question (the
shared module interface doesn't pass sender balance, which this module
needs) before implementation.

### `backend/indexer`

Implemented and verified. Fetches `compliant_token`'s `#[contractevent]`
events via Soroban RPC and mirrors cap-table state (balances, module
registrations) into Postgres, idempotently (Stellar's own event id is the
dedup key). Event-sourcing pattern, following the same architectural style
as this account's other backend project (SubTrackr). See
`backend/indexer/README.md` for what was verified against a real Postgres
instance and real on-chain events.

### `backend/api`

`GET /cap-table` implemented and verified against a real HTTP server + real
Postgres. Disclosure-report generation is not yet built — see
`backend/api/README.md`.

### `db/migrations`

Numbered Postgres migrations, following the same `NNN_description.sql`
convention as this account's other backend project.
