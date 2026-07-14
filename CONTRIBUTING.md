# Contributing

Contributions should preserve the core guarantees of this repository:

- a compliance module must fail closed — if a module can't determine
  whether a transfer is allowed, the transfer is rejected, never allowed
- the on-chain compliance state and the indexed off-chain cap-table must
  never silently drift apart
- nothing here is legal advice; module behavior should map to a documented
  regulatory rationale, not an assumption

## Known toolchain issue: `cargo test` currently fails to compile

As of this writing, `cargo test` fails during dependency compilation with an
unrelated trait-bound error inside `soroban-env-host`'s `testutils` feature
(`ChaCha20Rng` vs. `ed25519_dalek::rand_core::CryptoRng`) — a version-skew
bug between `ed25519-dalek` 3.0.0 and `rand_chacha`'s pinned `rand_core`,
upstream in `soroban-env-host 25.0.1`. It reproduces identically across this
account's other Soroban projects when tested fresh, confirming it isn't
something introduced here. Plain `cargo build` and `cargo clippy` (without
`--all-targets`) are unaffected and pass clean — that's how this repo's
contract logic (including a real cross-contract integration test between
`compliant_token` and `jurisdiction_allowlist`) was verified pending an
upstream fix.

## Development expectations

Before submitting changes:

1. Run contract tests: `cargo test` (or `make check` for fmt + clippy + test)
   — see the toolchain note above if this fails to compile in your
   environment.
2. Run backend tests: `cd backend && npm test`.
3. If you add or change a migration, add it as a new numbered file in
   `db/migrations/` — never edit a migration that's already merged.
4. If you change a compliance module's interface or a contract's public
   entrypoints, update `docs/RFC.md` and `ARCHITECTURE.md` in the same PR.
5. Run the e2e suite against testnet where feasible: `cd e2e && ./run_all.sh`.

## Scope notes

- This is pre-alpha. Nothing here should be treated as audited or
  production-ready until the external audit milestone lands.
- New compliance modules should be proposed as an RFC update before
  implementation — the module *set* is a design decision, not just a code
  change, since it defines what regulatory situations this standard
  actually covers.

## Pull request guidance

Good changes: new compliance modules with a documented rationale, indexer/
cap-table sync correctness fixes, disclosure-report format improvements,
test coverage, e2e script improvements, documentation fixes tied to actual
behavior.

Changes that need extra care and should start as a discussion issue first:
changing the compliance-module interface itself, changing what triggers a
transfer rejection, or anything that changes how on-chain and off-chain
state are kept in sync.

## Picking up an issue

Every open task uses the "Wave task" issue template with explicit acceptance
criteria and a difficulty rating (`easy` / `medium` / `hard`). Issues labeled
`good first issue` are scoped to be self-contained — comment on the issue
before starting so work doesn't collide.
