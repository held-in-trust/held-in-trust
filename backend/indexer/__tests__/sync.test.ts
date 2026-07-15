import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchContractEvents } from "../src/index.js";
import { applyEvents } from "../src/sync.js";

// Requires a real Postgres reachable at TEST_DATABASE_URL with
// db/migrations/001_cap_table.sql and 002_indexed_events_dedup_key.sql
// already applied. Skips gracefully if not configured.
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const CONFIG = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CC5DWOARRFSMWI6MS2E34WOZBSSN7LJ4ZKTJZYLWRPKTDNCMH74GNDXT",
};
const ADMIN = "GBNLWXU6V53DYDZRPBOKYADWEZP2NA6WEYHXTDMNNWV3ZX7UJ6S7ZGJZ";
const INVESTOR_A = "GBSWKCTZNLQX743A4XP4LSZ6ER4KPNOJGVNMNFTMT2WRG2ASQNBPRFFW";
const INVESTOR_B = "GD7KIBTWDOWSAVMVWKIOJR7RDBSX5EZDIJCN7MEU5NBT7A2AHOGN5A2S";

describeIfDb("applyEvents (real Postgres + real testnet events)", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("applies real on-chain mint/transfer/register_module events into correct cap-table balances", async () => {
    const events = await fetchContractEvents(CONFIG, 3612000);
    expect(events.length).toBeGreaterThan(0);

    // Applies at most events.length rows (fewer if this database already
    // saw some of these events from a prior run — the dedup key means that's
    // fine; what matters is the final state below, not the exact count).
    const appliedFirstRun = await applyEvents(pool, CONFIG.contractId, ADMIN, events);
    expect(appliedFirstRun).toBeGreaterThanOrEqual(0);
    expect(appliedFirstRun).toBeLessThanOrEqual(events.length);

    const issuer = await pool.query<{ id: string }>(
      "SELECT id FROM issuers WHERE contract_id = $1",
      [CONFIG.contractId],
    );
    expect(issuer.rows).toHaveLength(1);
    const issuerId = issuer.rows[0].id;

    // Investor A: +5000 (mint) - 200 (transfer out) = 4800
    const investorA = await pool.query<{ balance: string }>(
      "SELECT balance FROM holders WHERE issuer_id = $1 AND address = $2",
      [issuerId, INVESTOR_A],
    );
    expect(investorA.rows[0].balance).toBe("4800");

    // Investor B: +200 (transfer in)
    const investorB = await pool.query<{ balance: string }>(
      "SELECT balance FROM holders WHERE issuer_id = $1 AND address = $2",
      [issuerId, INVESTOR_B],
    );
    expect(investorB.rows[0].balance).toBe("200");

    const modules = await pool.query(
      "SELECT module_address FROM registered_modules WHERE issuer_id = $1",
      [issuerId],
    );
    expect(modules.rows.length).toBeGreaterThanOrEqual(1);

    // Idempotency: replaying the exact same events must not double-apply.
    const appliedSecondRun = await applyEvents(pool, CONFIG.contractId, ADMIN, events);
    expect(appliedSecondRun).toBe(0);

    const investorAAfterReplay = await pool.query<{ balance: string }>(
      "SELECT balance FROM holders WHERE issuer_id = $1 AND address = $2",
      [issuerId, INVESTOR_A],
    );
    expect(investorAAfterReplay.rows[0].balance).toBe("4800");
  }, 30_000);
});
