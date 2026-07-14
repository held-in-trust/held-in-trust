-- db/migrations/001_cap_table.sql
--
-- Cap-table state mirrored from compliant_token contract events by
-- backend/indexer. This table is a read-optimized cache of on-chain state —
-- the contract remains the source of truth; the indexer must be able to
-- rebuild this table from ledger history from scratch.

CREATE TABLE IF NOT EXISTS issuers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     TEXT NOT NULL UNIQUE,
  admin_address   TEXT NOT NULL,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id       UUID NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  address         TEXT NOT NULL,
  balance         NUMERIC(38, 0) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, address)
);

CREATE TABLE IF NOT EXISTS registered_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id       UUID NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  module_address  TEXT NOT NULL,
  module_kind     TEXT, -- e.g. 'jurisdiction_allowlist' — set by the indexer if known, NULL otherwise
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, module_address)
);

-- Every applied contract event, kept for auditability and to let the indexer
-- resume from the last processed ledger rather than rescanning from genesis.
CREATE TABLE IF NOT EXISTS indexed_events (
  id              BIGSERIAL PRIMARY KEY,
  issuer_id       UUID NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  ledger_sequence BIGINT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holders_issuer ON holders (issuer_id);
CREATE INDEX IF NOT EXISTS idx_registered_modules_issuer ON registered_modules (issuer_id);
CREATE INDEX IF NOT EXISTS idx_indexed_events_issuer_ledger ON indexed_events (issuer_id, ledger_sequence DESC);
