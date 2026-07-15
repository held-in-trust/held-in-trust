-- db/migrations/002_indexed_events_dedup_key.sql
--
-- 001 left indexed_events with no way to detect "already applied" beyond the
-- auto-increment id — replaying the same ledger range would double-apply
-- balance changes. Adds Stellar's own event id (e.g.
-- "0015515071140614144-0000000000", globally unique per event) as a real
-- dedup key so the sync logic can `ON CONFLICT (event_id) DO NOTHING`.

ALTER TABLE indexed_events ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_indexed_events_event_id ON indexed_events (event_id);
