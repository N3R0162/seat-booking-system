#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_FILE="config.template.js"
OUTPUT_FILE="config.js"

if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  echo "Template file ${TEMPLATE_FILE} not found."
  exit 1
fi

: "${SHEETDB_API_URL:=}"
: "${SHEETDB_BEARER_TOKEN:=}"

python3 <<'PY'
import os
from pathlib import Path

template_path = Path("config.template.js")
output_path = Path("config.js")

api_url = os.environ.get("SHEETDB_API_URL", "")
api_token = os.environ.get("SHEETDB_BEARER_TOKEN", "")

content = template_path.read_text()
content = content.replace("__SHEETDB_API_URL__", api_url)
content = content.replace("__SHEETDB_BEARER_TOKEN__", api_token)

output_path.write_text(content)

print(f"Generated {output_path} with provided environment variables.")
PY
