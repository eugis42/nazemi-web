#!/usr/bin/env bash
# Emergency VPS build for 4 GiB CT. Prefer Mac build + lean tarball (DEPLOYMENT.md).
# Ceiling: Next+Payload still wants ~1–2 GiB; stop app + swap help. No magic.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v pm2 >/dev/null 2>&1; then
  echo "→ pm2 stop nazemi (free RAM for build)"
  pm2 stop nazemi || true
fi

echo "→ npm run build:lowmem (heap 1792 MB, cpus=1)"
npm run build:lowmem

echo
echo "Done. Before start:"
echo "  ln -sfn \"\$(pwd)/media\" .next/standalone/media"
echo "  pm2 start nazemi   # or: ./start-standalone.sh"
echo
echo "If this OOM'd: add 1–2 GiB swap (see DEPLOYMENT.md) or build on Mac."
