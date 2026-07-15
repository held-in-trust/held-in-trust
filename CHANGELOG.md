# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial repository scaffold: contracts, backend, db, e2e directory structure.
- `compliant_token` base contract with a pluggable compliance-module
  interface, implemented and unit tested.
- `jurisdiction_allowlist` compliance module, implemented and unit tested.
- `accredited_investor` compliance module (expiry-based accreditation),
  implemented and unit tested.
- Postgres migration for the cap-table schema (`db/migrations/001_cap_table.sql`,
  `002_indexed_events_dedup_key.sql`).
- Both contracts deployed and verified on Stellar Testnet with a passing
  `e2e/` suite; `compliant_token` redeployed with real `#[contractevent]`
  events for mint/transfer/register_module.
- Real Soroban event indexer (`backend/indexer`): fetches and decodes live
  on-chain events, syncs them into the cap-table idempotently. Verified
  against a real Postgres instance and real on-chain transactions — correct
  balance math and confirmed no double-application on replay.
- Issuer API (`backend/api`): `GET /cap-table` implemented as a real Node
  HTTP server, verified with a real socket + real Postgres (4 tests).
- Protocol RFC draft (`docs/RFC.md`).
- CI, issue templates, and contribution guidelines.
