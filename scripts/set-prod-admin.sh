#!/usr/bin/env bash
# One-shot: set production admin from env PROD_ADMIN_EMAIL / PROD_ADMIN_PASSWORD
set -euo pipefail
cd "$(dirname "$0")/.."
exec npx tsx scripts/set-prod-admin.ts
