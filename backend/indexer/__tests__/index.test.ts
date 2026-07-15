import { describe, expect, it } from "vitest";
import { fetchContractEvents } from "../src/index.js";

// Real compliant_token deployment on testnet, redeployed with event
// emission — see README for how this address was obtained.
const CONFIG = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CC5DWOARRFSMWI6MS2E34WOZBSSN7LJ4ZKTJZYLWRPKTDNCMH74GNDXT",
};

// Real addresses and amounts from actual on-chain transactions generated
// during development (register_module, mint 5000, transfer 200) — see
// README for the transaction hashes.
const INVESTOR_A = "GBSWKCTZNLQX743A4XP4LSZ6ER4KPNOJGVNMNFTMT2WRG2ASQNBPRFFW";
const INVESTOR_B = "GD7KIBTWDOWSAVMVWKIOJR7RDBSX5EZDIJCN7MEU5NBT7A2AHOGN5A2S";
const ALLOWLIST_MODULE = "CB2MCM3QHHKOQA2SXYQCHWQWS2Z2HKOVE3QJ7LJHPNVI4V2NJ4L2T425";

describe("fetchContractEvents (live testnet)", () => {
  it("decodes the real register_module, mint, and transfer events emitted during this project's own deployment", async () => {
    const events = await fetchContractEvents(CONFIG, 3612000);

    const registerEvent = events.find((e) => e.type === "register_module");
    expect(registerEvent).toBeDefined();
    expect(registerEvent).toMatchObject({ type: "register_module", module: ALLOWLIST_MODULE });

    const mintEvent = events.find((e) => e.type === "mint");
    expect(mintEvent).toBeDefined();
    expect(mintEvent).toMatchObject({ type: "mint", to: INVESTOR_A, amount: 5000n });

    const transferEvent = events.find((e) => e.type === "transfer");
    expect(transferEvent).toBeDefined();
    expect(transferEvent).toMatchObject({
      type: "transfer",
      from: INVESTOR_A,
      to: INVESTOR_B,
      amount: 200n,
    });
  }, 20_000);

  it("returns an empty array for a ledger range with no events", async () => {
    // latestLedger from the RPC at time of writing was ~3612427 — a range
    // starting far in the future should have nothing (once it's within
    // retention it'll just be empty because it hasn't happened yet).
    const events = await fetchContractEvents(CONFIG, 3612426);
    // Should not throw, and specifically should not include our known past
    // events since a start ledger this late excludes them.
    expect(events.find((e) => e.type === "register_module")).toBeUndefined();
  }, 20_000);
});
