#!/usr/bin/env bash
# Dump CMS content for staging/prod sync — NEVER includes auth users.
# Usage: ./scripts/db-dump-content.sh [outfile.dump]
set -euo pipefail

OUT="${1:-nazemi-content.dump}"
: "${DATABASE_URL:?Set DATABASE_URL}"

# Omit auth tables entirely so a careless --clean restore cannot wipe logins.
EXCLUDE=(
  --exclude-table=public.users
  --exclude-table=public.users_sessions
)

pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  "${EXCLUDE[@]}" \
  --file="$OUT"

echo "Wrote $OUT (users + users_sessions omitted)"
