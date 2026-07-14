/**
 * Held in Trust event indexer.
 *
 * Design skeleton, not yet wired to a real Soroban RPC event stream — see
 * the seeded issues ("Build Soroban event indexer service"). The types here
 * define the shape the rest of the backend (cap-table sync, disclosure
 * reports) should code against, and mirror the schema in
 * `db/migrations/001_cap_table.sql` (verified against a live Postgres
 * instance during scaffolding).
 */

export interface IndexerConfig {
  rpcUrl: string;
  networkPassphrase: string;
  databaseUrl: string;
  /** compliant_token contract ids to index, one per issuer. */
  contractIds: string[];
}

export type ContractEventType =
  | "transfer"
  | "mint"
  | "module_registered";

export interface IndexedEvent {
  contractId: string;
  ledgerSequence: number;
  eventType: ContractEventType;
  payload: Record<string, unknown>;
}

/**
 * Fetches new contract events since the last indexed ledger for each
 * configured contract, and applies them to the cap-table tables
 * (`issuers`, `holders`, `registered_modules`, `indexed_events`).
 *
 * @remarks Not yet implemented — requires a real Soroban RPC event-streaming
 * client. This signature is the intended entry point for the indexer's main
 * loop.
 */
export async function syncOnce(_config: IndexerConfig): Promise<IndexedEvent[]> {
  throw new Error("not implemented — see CONTRIBUTING.md and the seeded issues");
}
