# Held in Trust

An open compliance-module standard for tokenized real-world assets (RWA) on
Soroban, paired with a self-hostable issuer backend for cap-table management
and disclosure reporting — infrastructure, not another closed tokenization
platform.

> **Status: pre-alpha, actively being designed.** See [Roadmap](#roadmap) and
> the seeded issues for what's actually built versus planned.

## Live on testnet

Both contracts are deployed, initialized, wired together (the allow-list
module is registered with the token), and verified working end to end on
Stellar Testnet — real cross-contract compliance enforcement, not a mock.
`compliant_token` was redeployed at the address below after adding real
`#[contractevent]` events (`MintEvent`, `TransferEvent`,
`ModuleRegisteredEvent`) for the indexer to consume:

| Contract | Address |
|---|---|
| `compliant_token` | [`CC5DWOARRFSMWI6MS2E34WOZBSSN7LJ4ZKTJZYLWRPKTDNCMH74GNDXT`](https://stellar.expert/explorer/testnet/contract/CC5DWOARRFSMWI6MS2E34WOZBSSN7LJ4ZKTJZYLWRPKTDNCMH74GNDXT) |
| `jurisdiction_allowlist` | [`CB2MCM3QHHKOQA2SXYQCHWQWS2Z2HKOVE3QJ7LJHPNVI4V2NJ4L2T425`](https://stellar.expert/explorer/testnet/contract/CB2MCM3QHHKOQA2SXYQCHWQWS2Z2HKOVE3QJ7LJHPNVI4V2NJ4L2T425) |

`e2e/02_issuance_lifecycle_flow.sh` genuinely exercises: mint → transfer to a
non-allow-listed investor (correctly rejected on-chain) → allow-list them →
same transfer now succeeds.

The indexer (`backend/indexer`) fetches and decodes these events for real
against this deployment — see its README for the specific transaction
hashes and verified balance math.

## The problem

RWA is one of Stellar's fastest-growing verticals — roughly $3B tokenized in
2025 — yet issuers have no open, standardized way to encode securities-law
transfer restrictions (jurisdiction limits, accreditation gating, lock-ups)
directly into their tokens, and no shared backend for cap-table management or
investor disclosure reporting. Research into existing Stellar RWA projects
found only a handful of SCF-funded grantees, all closed, proprietary-leaning
platforms — none publish an open compliance-module framework or issuer
backend. Ethereum has a mature answer to exactly this (ERC-3643/T-REX);
Soroban doesn't yet.

## The approach

1. A pluggable Soroban contract framework: a base token contract plus
   independently composable **compliance modules** (jurisdiction allow-list,
   accredited-investor gating, lock-up/vesting) — issuers pick the modules
   their regulatory situation actually needs, rather than adopting one
   monolithic implementation.
2. An open-source, self-hostable **issuer backend**: cap-table state mirrored
   from on-chain events, an accreditation-status store, and automated
   disclosure-report generation.

This is a standards play — positioned the way T-REX is positioned on
Ethereum — not a proprietary tokenization SaaS.

## Repository layout

```
contracts/
  compliant_token/     Base SEP-41-compatible token with a pluggable compliance-module interface
  modules/
    jurisdiction_allowlist/
    accredited_investor/
    lockup_vesting/
backend/
  indexer/             Soroban event indexer keeping cap-table state in sync
  api/                 GraphQL/REST API over the indexed state
db/migrations/         Numbered Postgres migrations
e2e/                   Idempotent stellar-cli scripts exercising the full issuance lifecycle on testnet
docs/                  RFC and architecture notes
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/RFC.md`](docs/RFC.md).

## Roadmap

| Phase | Focus |
|---|---|
| Months 1–2 | Compliance-module interface RFC, validate against real issuer requirements |
| Months 3–5 | Base compliant token + jurisdiction/lock-up modules, tests |
| Months 6–8 | Issuer backend (indexer, cap-table sync, accreditation module, disclosure reports) |
| Months 9–10 | Pilot issuer, DEX/lending interoperability guide, external audit |
| Months 11–12 | Publish v1.0 spec + backend, SCF Build Award application |

Every item is tracked as a GitHub issue under the matching milestone — see
[Issues](../../issues) and [Milestones](../../milestones).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues labeled `good first issue`
are scoped for a first contribution; every issue uses the "Wave task"
template with explicit acceptance criteria and difficulty rating.

## License

[MIT](LICENSE)
