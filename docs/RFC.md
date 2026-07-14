# RFC v0.1: Compliance Module interface

**Status:** draft.

## 1. Motivation

RWA issuers on Soroban need to encode securities-law transfer restrictions
into their tokens, but there's no shared, open way to do this — every issuer
(or the handful of closed platforms serving them) builds bespoke logic. This
RFC defines an interface any compliance module can implement, so issuers
compose the modules their regulatory situation actually needs instead of
adopting one monolithic implementation.

## 2. The interface

Every compliance module is a standalone Soroban contract exposing:

```
fn is_transfer_allowed(env: Env, from: Address, to: Address, amount: i128) -> bool
```

`compliant_token` calls this dynamically (`env.invoke_contract`) for every
registered module on every transfer (including mints, treated as a
transfer-in). All registered modules must return `true` for the transfer to
proceed.

## 3. Known limitation, found during scaffolding

The interface above does not give a module access to the sender's current
balance — fine for `jurisdiction_allowlist` (doesn't need it), but a real
problem for `lockup_vesting` (needs to know what fraction of a balance is
still locked). Two options, undecided:

- **(a)** Extend the shared interface to `is_transfer_allowed(from, to,
  amount, from_balance)` — keeps modules token-agnostic but leaks a balance
  value into every module call even when unneeded.
- **(b)** Let a module query the token contract's `balance()` directly —
  simpler, but gives that module a compile-time dependency on
  `compliant_token`'s interface, breaking the "modules have zero
  compile-time coupling" property `jurisdiction_allowlist` currently has.

Resolve this before implementing `lockup_vesting` (see that module's
README) — don't implement around it silently either way without recording
the decision here.

## 4. Module registration and removal

Currently `register_module` only appends — there's no `deregister_module`.
Whether removal should be supported (and what happens to transfers already
in flight if it is) is an open question.

## 5. Disclosure report format

Not yet drafted. Needs input from real issuer requirements (Month 1–2
validation step) before committing to a schema.
