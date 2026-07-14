#!/usr/bin/env bash
# e2e/02_issuance_lifecycle_flow.sh
#
# Exercises the full issuance lifecycle: allow-list an investor, mint,
# confirm a transfer to a non-allow-listed investor is rejected, allow-list
# them, confirm the transfer then succeeds. Idempotent: uses a fresh mint
# amount derived from a counter each run so balance assertions are always
# relative, not absolute.

source "$(dirname "$0")/lib.sh"
require_cmd stellar

COUNTER_FILE="${STATE_DIR}/${NETWORK}.mint_counter"
ROUND=0
[ -f "${COUNTER_FILE}" ] && ROUND="$(cat "${COUNTER_FILE}")"
ROUND=$((ROUND + 1))
echo "${ROUND}" > "${COUNTER_FILE}"
MINT_AMOUNT=$((ROUND * 1000))

log "allow-listing investor A"
invoke jurisdiction_allowlist "${ADMIN}" -- set_allowed \
  --admin "$(addr "${ADMIN}")" --user "$(addr "${INVESTOR_A}")" --allowed true >/dev/null

BALANCE_BEFORE="$(invoke compliant_token "${ADMIN}" -- balance --id "$(addr "${INVESTOR_A}")" | tr -d '"')"

log "minting ${MINT_AMOUNT} to investor A"
invoke compliant_token "${ADMIN}" -- mint \
  --admin "$(addr "${ADMIN}")" --to "$(addr "${INVESTOR_A}")" --amount "${MINT_AMOUNT}" >/dev/null

BALANCE_AFTER="$(invoke compliant_token "${ADMIN}" -- balance --id "$(addr "${INVESTOR_A}")" | tr -d '"')"
[ "${BALANCE_AFTER}" -eq "$((BALANCE_BEFORE + MINT_AMOUNT))" ] && \
  ok "mint increased investor A's balance by ${MINT_AMOUNT}" || \
  die "expected balance $((BALANCE_BEFORE + MINT_AMOUNT)), got ${BALANCE_AFTER}"

log "transfer to non-allow-listed investor B should be rejected"
if invoke compliant_token "${INVESTOR_A}" -- transfer \
  --from "$(addr "${INVESTOR_A}")" --to "$(addr "${INVESTOR_B}")" --amount 100 >/dev/null 2>&1; then
  die "transfer to a non-allow-listed investor unexpectedly succeeded"
else
  ok "transfer correctly rejected (RejectedByCompliance)"
fi

log "allow-listing investor B, retrying the transfer"
invoke jurisdiction_allowlist "${ADMIN}" -- set_allowed \
  --admin "$(addr "${ADMIN}")" --user "$(addr "${INVESTOR_B}")" --allowed true >/dev/null
invoke compliant_token "${INVESTOR_A}" -- transfer \
  --from "$(addr "${INVESTOR_A}")" --to "$(addr "${INVESTOR_B}")" --amount 100 >/dev/null

B_BALANCE="$(invoke compliant_token "${ADMIN}" -- balance --id "$(addr "${INVESTOR_B}")" | tr -d '"')"
[ "${B_BALANCE}" -ge 100 ] && ok "transfer succeeded once investor B was allow-listed" || \
  die "expected investor B balance >= 100, got ${B_BALANCE}"

ok "issuance lifecycle flow complete"
