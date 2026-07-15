import type { AddressInfo } from "node:net";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiServer } from "../src/server.js";

// Requires a real Postgres reachable at TEST_DATABASE_URL with the cap-table
// migrations applied (001_cap_table.sql, 002_indexed_events_dedup_key.sql).
// Seeds its own deterministic test data directly — deliberately not
// depending on any specific historical on-chain deployment's live event
// history, which would make this test fragile (testnet resets, retention
// windows). The indexer's own tests (backend/indexer/__tests__/sync.test.ts)
// are what verify real on-chain events apply correctly; this test verifies
// the API layer reads whatever is in the cap table correctly.
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIfDb = DATABASE_URL ? describe : describe.skip;

const ISSUER_CONTRACT_ID = "CTEST_ISSUER_FOR_API_SERVER_TEST";

describeIfDb("Issuer API server (real HTTP, real socket, real Postgres)", () => {
  let baseUrl: string;
  let seedPool: Pool;
  const server = createApiServer({ databaseUrl: DATABASE_URL! });

  beforeAll(async () => {
    seedPool = new Pool({ connectionString: DATABASE_URL });
    await seedPool.query(
      `INSERT INTO issuers (contract_id, admin_address, name)
       VALUES ($1, 'GADMINTESTADDRESS', 'API Server Test Issuer')
       ON CONFLICT (contract_id) DO NOTHING`,
      [ISSUER_CONTRACT_ID],
    );
    const issuer = await seedPool.query<{ id: string }>(
      "SELECT id FROM issuers WHERE contract_id = $1",
      [ISSUER_CONTRACT_ID],
    );
    const issuerId = issuer.rows[0].id;
    await seedPool.query(
      `INSERT INTO holders (issuer_id, address, balance) VALUES
         ($1, 'GHOLDERA', 4800),
         ($1, 'GHOLDERB', 200)
       ON CONFLICT (issuer_id, address) DO UPDATE SET balance = EXCLUDED.balance`,
      [issuerId],
    );

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await seedPool.end();
  });

  it("returns 400 when issuerContractId is missing", async () => {
    const res = await fetch(`${baseUrl}/cap-table`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown route", async () => {
    const res = await fetch(`${baseUrl}/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it("serves the seeded cap table over a real HTTP request, ordered by balance descending", async () => {
    const res = await fetch(`${baseUrl}/cap-table?issuerContractId=${ISSUER_CONTRACT_ID}`);
    expect(res.status).toBe(200);
    const entries = (await res.json()) as Array<{ address: string; balance: string }>;
    expect(entries).toEqual([
      { address: "GHOLDERA", balance: "4800" },
      { address: "GHOLDERB", balance: "200" },
    ]);
  });

  it("returns an empty array for an issuer with no cap table", async () => {
    const res = await fetch(`${baseUrl}/cap-table?issuerContractId=CDOESNOTEXISTATALL`);
    expect(res.status).toBe(200);
    const entries = await res.json();
    expect(entries).toEqual([]);
  });
});
