#!/usr/bin/env bash
# e2e/01_setup_and_deploy.sh
#
# Idempotent setup: identities, build both contract wasms, deploy each once,
# initialize compliant_token, register the allowlist module. Safe to re-run.

source "$(dirname "$0")/lib.sh"
require_cmd stellar

log "network: ${NETWORK}"

for id in "${ADMIN}" "${INVESTOR_A}" "${INVESTOR_B}"; do
  ensure_identity "${id}"
done

log "building contract wasms"
( cd "${REPO_ROOT}" && cargo build --target wasm32v1-none --release )

WASM_DIR="${REPO_ROOT}/target/wasm32v1-none/release"
deploy_if_needed compliant_token "${WASM_DIR}/held_in_trust_compliant_token.wasm"
deploy_if_needed jurisdiction_allowlist "${WASM_DIR}/held_in_trust_jurisdiction_allowlist.wasm"

INIT_MARKER="${STATE_DIR}/${NETWORK}.initialized"
if [ -f "${INIT_MARKER}" ]; then
  ok "already initialized and wired up"
else
  log "initializing compliant_token"
  invoke compliant_token "${ADMIN}" -- initialize --admin "$(addr "${ADMIN}")" >/dev/null

  log "initializing jurisdiction_allowlist"
  invoke jurisdiction_allowlist "${ADMIN}" -- initialize --admin "$(addr "${ADMIN}")" >/dev/null

  log "registering jurisdiction_allowlist with compliant_token"
  invoke compliant_token "${ADMIN}" -- register_module \
    --admin "$(addr "${ADMIN}")" --module "$(contract_id jurisdiction_allowlist)" >/dev/null

  touch "${INIT_MARKER}"
  ok "initialized and wired up"
fi

ok "setup complete"
