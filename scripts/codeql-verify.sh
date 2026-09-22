#!/usr/bin/env bash
# Analyse CodeQL locale (JavaScript/TypeScript) — même périmètre que .github/codeql/codeql-config.yml
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# CodeQL (Apache HttpClient) rejette un proxy avec slash final (ex. http://proxy:3128/).
normalize_proxy_var() {
  local name=$1
  local val="${!name:-}"
  [[ -z "${val}" ]] && return 0
  val="${val%/}"
  export "${name}=${val}"
}
for name in http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY; do
  normalize_proxy_var "${name}"
done
if [[ -n "${http_proxy:-}" && -z "${HTTP_PROXY:-}" ]]; then export HTTP_PROXY="${http_proxy}"; fi
if [[ -n "${https_proxy:-}" && -z "${HTTPS_PROXY:-}" ]]; then export HTTPS_PROXY="${https_proxy}"; fi

if [[ "${SKIP_CODEQL:-}" == "1" ]]; then
  echo "CodeQL: ignoré (SKIP_CODEQL=1)."
  exit 0
fi

resolve_codeql() {
  if [[ -n "${CODEQL:-}" && -x "${CODEQL}" ]]; then
    echo "${CODEQL}"
    return 0
  fi
  if command -v codeql >/dev/null 2>&1; then
    command -v codeql
    return 0
  fi
  local local_bin="${ROOT}/.codeql-cli/codeql/codeql"
  if [[ -x "${local_bin}" ]]; then
    echo "${local_bin}"
    return 0
  fi
  return 1
}

if ! CODEQL_BIN="$(resolve_codeql)"; then
  echo "CodeQL CLI introuvable." >&2
  echo "  • Installation locale : npm run codeql:install" >&2
  echo "  • Ou bundle manuel : https://github.com/github/codeql-cli-binaries/releases" >&2
  echo "  • Contournement : SKIP_CODEQL=1 make verify" >&2
  exit 1
fi
DB="${ROOT}/.codeql-db"
SARIF="${ROOT}/.codeql-results.sarif"
SRC="${ROOT}/src"
SUITE="codeql/javascript-queries:codeql-suites/javascript-security-extended.qls"

echo "CodeQL: création de la base (${DB}), périmètre ${SRC}…"
rm -rf "${DB}"
# build-mode=none : évite l'autobuild Node (incompatible avec "type":"module" du package.json racine).
"${CODEQL_BIN}" database create "${DB}" \
  --language=javascript-typescript \
  --source-root="${SRC}" \
  --build-mode=none \
  --overwrite

echo "CodeQL: analyse (suite sécurité JS/TS)…"
"${CODEQL_BIN}" database analyze "${DB}" \
  --format=sarif-latest \
  --output="${SARIF}" \
  --download \
  --threads=0 \
  "${SUITE}"

node "${ROOT}/scripts/codeql-fail-on-results.mjs" "${SARIF}"
echo "CodeQL: aucune alerte bloquante."
