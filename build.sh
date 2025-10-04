#!/usr/bin/env bash
set -euo pipefail

echo "[build] Starting config generation"

TEMPLATE_FILE="config.template.js"
OUTPUT_FILE="config.js"

: "${SHEETDB_API_URL:=}"
: "${SHEETDB_BEARER_TOKEN:=}"

# Escape backslashes and double quotes for safe JS string embedding
escape() {
  local v="${1//\\/\\\\}"
  v="${v//\"/\\\"}"
  printf '%s' "$v"
}

API_URL_ESCAPED="$(escape "${SHEETDB_API_URL}")"
TOKEN_ESCAPED="$(escape "${SHEETDB_BEARER_TOKEN}")"

cat > "${OUTPUT_FILE}" <<EOF
window.__SEAT_BOOKING_CONFIG__ = {
  SHEETDB_API_URL: "${API_URL_ESCAPED}",
  SHEETDB_BEARER_TOKEN: "${TOKEN_ESCAPED}"
};
EOF

echo "[build] Generated ${OUTPUT_FILE}"
if [[ -z "${SHEETDB_API_URL}" ]]; then
  echo "[build][warn] SHEETDB_API_URL is empty. The app will run in 'no remote persistence' mode."
fi
echo "[build] Done."