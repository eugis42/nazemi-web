#!/usr/bin/env bash
# Restore content dump WITHOUT wiping users.
# Prefer this over DROP SCHEMA + full restore.
#
# Usage: ./scripts/db-restore-content.sh nazemi-content.dump
set -euo pipefail

DUMP="${1:?usage: $0 file.dump}"
: "${DATABASE_URL:?Set DATABASE_URL}"

if [[ ! -f "$DUMP" ]]; then
  echo "Missing dump: $DUMP" >&2
  exit 1
fi

# Safety: refuse if dump appears to include user rows (plain SQL check N/A for custom).
# Always snapshot users first so a bad restore is recoverable.
STAMP="$(date +%Y%m%d-%H%M%S)"
USERS_BAK="${USERS_BAK:-users-backup-${STAMP}.dump}"

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --table=public.users \
  --table=public.users_sessions \
  --file="$USERS_BAK"
echo "Users backup → $USERS_BAK"

# Data-only restore; do not --clean drop auth tables.
# Conflicts on PK: use --data-only and skip users tables if present in dump.
pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  --disable-triggers \
  --exclude-table-data=public.users \
  --exclude-table-data=public.users_sessions \
  "$DUMP" || true

echo "Content restore attempted. Users left intact (backup: $USERS_BAK)."
echo "If schema drifted, run npm run db:push first — never DROP SCHEMA for content sync."
