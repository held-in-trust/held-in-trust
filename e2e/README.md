# End-to-end tests (real Soroban testnet)

Idempotent bash scripts that deploy `compliant_token` + `jurisdiction_allowlist`
and drive the full issuance lifecycle against a live network (Testnet by
default), asserting on-chain state.

## Prerequisites

`stellar` CLI, a Rust toolchain with the `wasm32-unknown-unknown` target. No
pre-funded account needed — identities are created and funded via Friendbot.

## Usage

```bash
cd e2e && ./run_all.sh
```

## Coverage

- `01_setup_and_deploy.sh` — identities, build, deploy both contracts,
  initialize, register the allowlist module (all idempotent).
- `02_issuance_lifecycle_flow.sh` — allow-list → mint → confirm a transfer to
  a non-allow-listed investor is rejected → allow-list them → confirm the
  transfer then succeeds.

## Not yet covered

`accredited_investor` and `lockup_vesting` have no e2e coverage — they're
design-only (see their READMEs under `contracts/modules/`), not implemented
yet.
