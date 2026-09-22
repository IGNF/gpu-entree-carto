#!/usr/bin/env bash
# Télécharge le bundle CodeQL CLI (Linux x64) dans .codeql-cli/ (hors git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/.codeql-cli"
CODEQL_VERSION="${CODEQL_VERSION:-v2.27.0}"
ZIP_URL="https://github.com/github/codeql-cli-binaries/releases/download/${CODEQL_VERSION}/codeql-linux64.zip"
BIN="${DEST}/codeql/codeql"

if [[ -x "${BIN}" ]] && [[ -f "${DEST}/VERSION" ]] && grep -Fxq "${CODEQL_VERSION}" "${DEST}/VERSION"; then
  echo "CodeQL déjà installé (${CODEQL_VERSION}) : ${BIN}"
  "${BIN}" version
  exit 0
fi

for cmd in curl unzip; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "« ${cmd} » requis pour installer CodeQL." >&2
    exit 1
  fi
done

mkdir -p "${DEST}"
ZIP="${DEST}/codeql-linux64.zip"
echo "CodeQL: téléchargement ${CODEQL_VERSION} (~400 Mo)…"
curl -fsSL --retry 3 -o "${ZIP}" "${ZIP_URL}"
echo "CodeQL: extraction…"
rm -rf "${DEST}/codeql"
unzip -q -o "${ZIP}" -d "${DEST}"
rm -f "${ZIP}"
echo "${CODEQL_VERSION}" > "${DEST}/VERSION"
# Sans ceci, Node remonte jusqu’au package.json racine ("type":"module") et casse le parser TS CodeQL.
printf '%s\n' '{"private":true,"type":"commonjs"}' > "${DEST}/codeql/package.json"
echo "CodeQL installé : ${BIN}"
"${BIN}" version
