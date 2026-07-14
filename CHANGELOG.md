# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial repository scaffold: contracts, backend, db, e2e directory structure.
- `compliant_token` base contract with a pluggable compliance-module
  interface, implemented and unit tested.
- `jurisdiction_allowlist` compliance module, implemented and unit tested.
- Postgres migration for the cap-table schema (`db/migrations/001_cap_table.sql`).
- Protocol RFC draft (`docs/RFC.md`).
- CI, issue templates, and contribution guidelines.
