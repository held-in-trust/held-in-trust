/**
 * Applies parsed compliant_token events to the cap-table tables
 * (db/migrations/001_cap_table.sql, 002_indexed_events_dedup_key.sql).
 * Idempotent: each event's Stellar-assigned event id is the dedup key
 * (`indexed_events.event_id`, unique) — replaying an already-applied event
 * is a no-op rather than double-crediting a balance.
 */

import type { Pool, PoolClient } from "pg";
import type { ParsedEvent } from "./index.js";

async function getOrCreateIssuer(
  client: PoolClient,
  contractId: string,
  adminAddress: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM issuers WHERE contract_id = $1",
    [contractId],
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  const inserted = await client.query<{ id: string }>(
    "INSERT INTO issuers (contract_id, admin_address, name) VALUES ($1, $2, $3) RETURNING id",
    [contractId, adminAddress, contractId],
  );
  return inserted.rows[0].id;
}

async function applyBalanceDelta(
  client: PoolClient,
  issuerId: string,
  address: string,
  delta: bigint,
): Promise<void> {
  await client.query(
    `INSERT INTO holders (issuer_id, address, balance)
     VALUES ($1, $2, $3)
     ON CONFLICT (issuer_id, address)
     DO UPDATE SET balance = holders.balance + EXCLUDED.balance, updated_at = now()`,
    [issuerId, address, delta.toString()],
  );
}

/**
 * Applies a batch of already-fetched events to the cap-table for
 * `contractId`, in a single transaction. Returns the number of events that
 * were newly applied (excludes ones already indexed).
 */
export async function applyEvents(
  pool: Pool,
  contractId: string,
  adminAddress: string,
  events: ParsedEvent[],
): Promise<number> {
  const client = await pool.connect();
  let appliedCount = 0;
  try {
    await client.query("BEGIN");
    const issuerId = await getOrCreateIssuer(client, contractId, adminAddress);

    for (const event of events) {
      const inserted = await client.query(
        `INSERT INTO indexed_events (issuer_id, ledger_sequence, event_type, payload, event_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        [issuerId, event.ledger, event.type, JSON.stringify(serializeEvent(event)), event.eventId],
      );
      if (inserted.rows.length === 0) {
        continue; // already applied
      }
      appliedCount += 1;

      if (event.type === "mint") {
        await applyBalanceDelta(client, issuerId, event.to, event.amount);
      } else if (event.type === "transfer") {
        await applyBalanceDelta(client, issuerId, event.from, -event.amount);
        await applyBalanceDelta(client, issuerId, event.to, event.amount);
      } else if (event.type === "register_module") {
        await client.query(
          `INSERT INTO registered_modules (issuer_id, module_address)
           VALUES ($1, $2)
           ON CONFLICT (issuer_id, module_address) DO NOTHING`,
          [issuerId, event.module],
        );
      }
    }

    await client.query("COMMIT");
    return appliedCount;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function serializeEvent(event: ParsedEvent): Record<string, unknown> {
  return {
    ...event,
    amount: "amount" in event ? event.amount.toString() : undefined,
  };
}
