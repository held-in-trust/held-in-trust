/**
 * Real Soroban event indexer for the compliant_token contract. Consumes
 * the `#[contractevent]`-published MintEvent/TransferEvent/
 * ModuleRegisteredEvent events (see contracts/compliant_token/src/lib.rs)
 * via server.getEvents().
 *
 * Event shape (verified against real on-chain events during development):
 *   topic[0] = event name symbol, e.g. "mint_event" / "transfer_event" /
 *              "module_registered_event"
 *   topic[1..] = the struct's #[topic] fields, in declaration order
 *   value = a Map of the struct's remaining (non-topic) fields by name,
 *           e.g. { amount: 5000n } for MintEvent
 */

import { rpc, scValToNative } from "@stellar/stellar-sdk";

export interface IndexerConfig {
  rpcUrl: string;
  contractId: string;
}

export type ParsedEvent =
  | { type: "mint"; to: string; amount: bigint; ledger: number; txHash: string; eventId: string }
  | {
      type: "transfer";
      from: string;
      to: string;
      amount: bigint;
      ledger: number;
      txHash: string;
      eventId: string;
    }
  | { type: "register_module"; module: string; ledger: number; txHash: string; eventId: string };

/**
 * Fetches and decodes compliant_token events starting at `startLedger`.
 * `startLedger` must be within the RPC's retention window (`oldestLedger`
 * in the raw response) — the caller is responsible for tracking a cursor
 * (e.g. `indexed_events.ledger_sequence` in the cap-table schema) and not
 * requesting further back than the RPC retains.
 */
export async function fetchContractEvents(
  config: IndexerConfig,
  startLedger: number,
): Promise<ParsedEvent[]> {
  const server = new rpc.Server(config.rpcUrl);
  const response = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [config.contractId] }],
    limit: 100,
  });

  const parsed: ParsedEvent[] = [];
  for (const event of response.events) {
    const eventName = scValToNative(event.topic[0]) as string;
    const data = scValToNative(event.value) as Record<string, unknown>;

    if (eventName === "mint_event") {
      parsed.push({
        type: "mint",
        to: scValToNative(event.topic[1]) as string,
        amount: BigInt(data.amount as string | number | bigint),
        ledger: event.ledger,
        txHash: event.txHash,
        eventId: event.id,
      });
    } else if (eventName === "transfer_event") {
      parsed.push({
        type: "transfer",
        from: scValToNative(event.topic[1]) as string,
        to: scValToNative(event.topic[2]) as string,
        amount: BigInt(data.amount as string | number | bigint),
        ledger: event.ledger,
        txHash: event.txHash,
        eventId: event.id,
      });
    } else if (eventName === "module_registered_event") {
      parsed.push({
        type: "register_module",
        module: scValToNative(event.topic[1]) as string,
        ledger: event.ledger,
        txHash: event.txHash,
        eventId: event.id,
      });
    }
    // Unrecognized event names are silently skipped rather than throwing —
    // a future event type shouldn't break indexing of the ones we know.
  }
  return parsed;
}
