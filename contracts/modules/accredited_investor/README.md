# Accredited Investor Module

**Status: implemented and unit tested.** See `src/lib.rs`.

A compliance module implementing the shared `is_transfer_allowed(from, to,
amount) -> bool` interface: a transfer is allowed only if both parties hold
a current (non-expired) accreditation.

Unlike `jurisdiction_allowlist`'s static boolean flag, accreditation
**expires** — each investor has an expiry ledger, checked against
`env.ledger().sequence()` at transfer/query time. 6 unit tests cover the
expiry boundary (valid at exactly the expiry ledger, expired the ledger
after), immediate revocation (setting an already-past expiry), and
non-admin rejection.

## Still open

Whether accreditation status should be attestable by a third-party attestor
address (e.g. a KYC provider) rather than only the module's own admin — a
real design decision with compliance implications, not yet resolved. Track
as a follow-up if this becomes a real requirement rather than speculative.
