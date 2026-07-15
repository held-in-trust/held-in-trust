# Indexer

**Status: implemented and verified against live testnet + a real Postgres
instance.**

Fetches `compliant_token`'s `#[contractevent]` events (`MintEvent`,
`TransferEvent`, `ModuleRegisteredEvent` — see
`contracts/compliant_token/src/lib.rs`) via Soroban RPC's `getEvents`, and
syncs them into the cap-table tables from
`db/migrations/001_cap_table.sql` / `002_indexed_events_dedup_key.sql`.

## What's verified

- `fetchContractEvents` — decodes real on-chain events from the live
  `compliant_token` deployment. Event shape (`topic[0]` = event name symbol,
  `topic[1..]` = `#[topic]` fields, `value` = a Map of the remaining fields)
  was confirmed against the raw RPC response before writing the decoder, not
  guessed.
- `applyEvents` — applies parsed events to `holders`/`registered_modules` in
  a single transaction, using Stellar's own globally-unique event id as an
  `ON CONFLICT DO NOTHING` dedup key so replaying an already-indexed ledger
  range is a genuine no-op, not a double-credit. Verified against a real,
  disposable Postgres container: after applying a real mint (5000) and
  transfer (200), the resulting balances (4800 for the sender, 200 for the
  recipient) were checked, then the exact same events were re-applied and
  confirmed to apply zero new rows and leave balances unchanged.

## Not yet built

- A scheduled/running poller — this is a library of functions callable
  on-demand, not a long-running service yet.
- Backfill-from-genesis tooling for a newly tracked issuer.

## Running the tests yourself

```bash
# fetchContractEvents tests need only network access
npx vitest run indexer/__tests__/index.test.ts

# applyEvents tests also need a real Postgres with the migrations applied
docker run -d --name hit-pg -e POSTGRES_PASSWORD=verify -p 5556:5432 postgres:16-alpine
psql postgres://postgres:verify@localhost:5556/postgres -f ../../db/migrations/001_cap_table.sql
psql postgres://postgres:verify@localhost:5556/postgres -f ../../db/migrations/002_indexed_events_dedup_key.sql
TEST_DATABASE_URL="postgres://postgres:verify@localhost:5556/postgres" npx vitest run indexer
```
