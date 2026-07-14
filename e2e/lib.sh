# e2e/lib.sh
# Shared helpers for the Soroban testnet end-to-end scripts. Idempotent:
# identities created-if-missing then funded; each contract deployed once
# with its id cached in e2e/.state/. Source from numbered scripts:
# `source "$(dirname "$0")/lib.sh"`.

set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HERE}/.." && pwd)"
STATE_DIR="${HERE}/.state"

ADMIN="${ADMIN_IDENTITY:-hit_admin}"
INVESTOR_A="${INVESTOR_A_IDENTITY:-hit_investor_a}"
INVESTOR_B="${INVESTOR_B_IDENTITY:-hit_investor_b}"

mkdir -p "${STATE_DIR}"

log()  { printf '\033[0;34m[e2e]\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m[ ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[0;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

ensure_identity() {
  local name="$1"
  if stellar keys address "${name}" >/dev/null 2>&1; then
    log "identity '${name}' already exists ($(stellar keys address "${name}"))"
  else
    log "creating identity '${name}'"
    stellar keys generate "${name}" --network "${NETWORK}" >/dev/null
  fi
  stellar keys fund "${name}" --network "${NETWORK}" >/dev/null 2>&1 || \
    warn "could not fund '${name}' (already funded or Friendbot rate-limited)"
}

addr() { stellar keys address "$1"; }

contract_id() {
  local name="$1" f="${STATE_DIR}/${NETWORK}.${name}.contract_id"
  [ -f "${f}" ] || die "no deployed '${name}' contract; run 01_setup_and_deploy.sh first"
  cat "${f}"
}

deploy_if_needed() {
  local name="$1" wasm_path="$2" f="${STATE_DIR}/${NETWORK}.${name}.contract_id"
  if [ -f "${f}" ] && stellar contract invoke --id "$(cat "${f}")" --source "${ADMIN}" \
       --network "${NETWORK}" -- --help >/dev/null 2>&1; then
    ok "reusing existing '${name}' deployment $(cat "${f}")"
    return
  fi
  log "deploying '${name}'"
  local id
  id="$(stellar contract deploy --wasm "${wasm_path}" --source "${ADMIN}" --network "${NETWORK}")"
  echo "${id}" > "${f}"
  ok "deployed '${name}' -> ${id}"
}

invoke() {
  local contract_name="$1" source="$2"; shift 2
  stellar contract invoke \
    --id "$(contract_id "${contract_name}")" \
    --source "${source}" \
    --network "${NETWORK}" \
    "$@"
}
