#!/usr/bin/env bash
# Analyse CodeQL locale (JavaScript/TypeScript).
#
# Périmètre (CODEQL_SCOPE) :
#   src   — défaut, ./src uniquement (comme .github/codeql/codeql-config.yml)
#   dist  — ./dist uniquement (repro alertes bundles jsPDF / html2canvas du diff PR)
#   all   — src + dist (ignore temporaire de dist/ dans .codeqlignore)
#
# Exemples :
#   npm run verify:codeql
#   npm run verify:codeql:dist
#   CODEQL_SCOPE=all npm run verify:codeql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="${CODEQL_SCOPE:-src}"

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

case "${SCOPE}" in
  src | dist | all) ;;
  *)
    echo "CodeQL: CODEQL_SCOPE invalide « ${SCOPE} » (attendu: src, dist, all)." >&2
    exit 2
    ;;
esac

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
SUITE="codeql/javascript-queries:codeql-suites/javascript-security-extended.qls"
CODEQLIGNORE="${ROOT}/.codeqlignore"
CODEQLIGNORE_BACKUP=""

restore_codeqlignore() {
  if [[ -n "${CODEQLIGNORE_BACKUP}" && -f "${CODEQLIGNORE_BACKUP}" ]]; then
    mv -f "${CODEQLIGNORE_BACKUP}" "${CODEQLIGNORE}"
  fi
}

prepare_scope() {
  case "${SCOPE}" in
    src)
      SOURCE_ROOT="${ROOT}/src"
      echo "CodeQL: périmètre src/ (CODEQL_SCOPE=src)."
      ;;
    dist)
      SOURCE_ROOT="${ROOT}/dist"
      if [[ ! -d "${SOURCE_ROOT}" ]]; then
        echo "CodeQL: dist/ absent — exécutez npm run build avant verify:codeql:dist." >&2
        exit 1
      fi
      echo "CodeQL: périmètre dist/ (CODEQL_SCOPE=dist)."
      ;;
    all)
      SOURCE_ROOT="${ROOT}"
      if [[ ! -d "${ROOT}/dist" ]]; then
        echo "CodeQL: dist/ absent — exécutez npm run build avant CODEQL_SCOPE=all." >&2
        exit 1
      fi
      CODEQLIGNORE_BACKUP="$(mktemp)"
      cp "${CODEQLIGNORE}" "${CODEQLIGNORE_BACKUP}"
      trap restore_codeqlignore EXIT
      cat >"${CODEQLIGNORE}" <<'EOF'
# Généré par scripts/codeql-verify.sh (CODEQL_SCOPE=all) — ne pas committer.
node_modules/
coverage/
.codeql-cli/
.codeql-db/
.codeql-db-test/
EOF
      echo "CodeQL: périmètre src/ + dist/ (CODEQL_SCOPE=all, .codeqlignore temporaire)."
      ;;
  esac
}

prepare_scope

echo "CodeQL: création de la base (${DB}), source-root ${SOURCE_ROOT}…"
rm -rf "${DB}"
# build-mode=none : évite l'autobuild Node (incompatible avec "type":"module" du package.json racine).
"${CODEQL_BIN}" database create "${DB}" \
  --language=javascript-typescript \
  --source-root="${SOURCE_ROOT}" \
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
echo "CodeQL: aucune alerte bloquante (périmètre ${SCOPE})."
