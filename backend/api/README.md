# Issuer API

**Status: `getCapTable` implemented and verified against a real HTTP server
+ real Postgres. `generateDisclosureReport` not yet implemented** (the
report format is genuinely undrafted — see `docs/RFC.md` §5 — so this isn't
a shortcut, it's waiting on real input).

## What's verified

`GET /cap-table?issuerContractId=...` — a real Node HTTP server
(`src/server.ts`), tested by starting it on a real socket and hitting it
with real `fetch` calls against a real, migrated Postgres instance: correct
400 on a missing parameter, 404 on an unknown route, correct
balance-descending ordering, and an empty array (not an error) for an
issuer with no cap table.

The test seeds its own deterministic fixture data directly rather than
depending on any specific historical on-chain deployment's live event
history — that would make the test fragile against testnet resets or RPC
retention windows. Real on-chain event application is what
`backend/indexer/__tests__/sync.test.ts` verifies; this test verifies the
API layer reads whatever is in the cap table correctly.

## Running the tests yourself

```bash
docker run -d --name hit-pg -e POSTGRES_PASSWORD=verify -p 5557:5432 postgres:16-alpine
psql postgres://postgres:verify@localhost:5557/postgres -f ../../db/migrations/001_cap_table.sql
psql postgres://postgres:verify@localhost:5557/postgres -f ../../db/migrations/002_indexed_events_dedup_key.sql
TEST_DATABASE_URL="postgres://postgres:verify@localhost:5557/postgres" npx vitest run api
```

## Not yet built

- `generateDisclosureReport` (blocked on the RFC §5 format decision).
- Auth/access control — an issuer shouldn't be able to query another
  issuer's cap table in a real deployment; this reference implementation
  has none yet (tracked as an open issue).
