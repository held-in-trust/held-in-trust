# Held in Trust

An open compliance-module standard for tokenized real-world assets (RWA) on
Soroban, paired with a self-hostable issuer backend for cap-table management
and disclosure reporting — infrastructure, not another closed tokenization
platform.

> **Status: pre-alpha, actively being designed.** See [Roadmap](#roadmap) and
> the seeded issues for what's actually built versus planned.

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
