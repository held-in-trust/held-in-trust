/**
 * Held in Trust issuer API — real implementation over the cap-table schema
 * in `db/migrations/001_cap_table.sql`.
 */

import type { Pool } from "pg";

export interface CapTableEntry {
  address: string;
  balance: string; // numeric(38,0) as a string to avoid JS number precision loss
}

export interface DisclosureReport {
  issuerContractId: string;
  generatedAtLedger: number;
  holders: CapTableEntry[];
  totalSupply: string;
}

/**
 * Returns the cap table (non-zero holders) for a given issuer's
 * `compliant_token` contract id, ordered by balance descending.
 */
export async function getCapTable(
  pool: Pool,
  issuerContractId: string,
): Promise<CapTableEntry[]> {
  const result = await pool.query<CapTableEntry>(
    `SELECT h.address, h.balance::text AS balance
     FROM holders h
     JOIN issuers i ON i.id = h.issuer_id
     WHERE i.contract_id = $1 AND h.balance > 0
     ORDER BY h.balance DESC`,
    [issuerContractId],
  );
  return result.rows;
}

/**
 * @remarks Not yet implemented — the disclosure-report format itself is
 * undrafted (RFC §5 explicitly flags this as needing real issuer
 * requirements input first, not an engineering guess). getCapTable above is
 * the real building block this will be built on.
 */
export async function generateDisclosureReport(
  _pool: Pool,
  _issuerContractId: string,
): Promise<DisclosureReport> {
  throw new Error("not implemented — see docs/RFC.md §5 and the seeded issues");
}
