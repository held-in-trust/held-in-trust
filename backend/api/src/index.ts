/**
 * Held in Trust issuer API.
 *
 * Design skeleton over the cap-table schema in
 * `db/migrations/001_cap_table.sql` (verified against a live Postgres
 * instance during scaffolding). Not yet wired to a real GraphQL/REST server
 * — see the seeded issues ("Build GraphQL API for issuer backend",
 * "Build disclosure-report generator v1").
 */

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
 * @remarks Not yet implemented — requires a Postgres connection and a
 * decision on the disclosure-report format (RFC §5, currently undrafted).
 */
export async function getCapTable(
  _databaseUrl: string,
  _issuerContractId: string,
): Promise<CapTableEntry[]> {
  throw new Error("not implemented — see CONTRIBUTING.md and the seeded issues");
}

/**
 * @remarks Not yet implemented — see {@link getCapTable}.
 */
export async function generateDisclosureReport(
  _databaseUrl: string,
  _issuerContractId: string,
): Promise<DisclosureReport> {
  throw new Error("not implemented — see CONTRIBUTING.md and the seeded issues");
}
