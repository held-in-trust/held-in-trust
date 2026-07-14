# Accredited Investor Module

**Status: design only, not yet implemented.**

A compliance module implementing the shared `is_transfer_allowed(from, to,
amount) -> bool` interface (see `ARCHITECTURE.md` and
`contracts/modules/jurisdiction_allowlist` for the pattern to follow): a
transfer is allowed only if both parties hold a current accreditation
attestation.

## Design notes

- Unlike `jurisdiction_allowlist`'s simple boolean flag, accreditation
  typically **expires** — this module should store an expiry ledger per
  investor and check `env.ledger().sequence() <= expiry` at transfer time,
  not just a static allowed/disallowed flag.
- Consider whether accreditation status should be attestable by a
  third-party attestor address (e.g. a KYC provider) rather than only the
  module's own admin — this is a real design decision with compliance
  implications, not just a code detail.

## Interface to implement

Same shape as `jurisdiction_allowlist`: `initialize(admin)`,
`set_accredited(admin, investor, expiry_ledger)`, `is_accredited(investor) ->
bool`, `is_transfer_allowed(from, to, amount) -> bool`.
