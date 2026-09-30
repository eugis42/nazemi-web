#!/usr/bin/env bash
# Emergency VPS build for 4 GiB CT. Prefer Mac + ./scripts/deploy-standalone.sh.
# Ceiling: Next+Payload still wants ~1–2 GiB; stop app + swap help. No magic.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v pm2 >/dev/null 2>&1; then
  echo "→ pm2 stop nazemi (free RAM for build)"
  pm2 stop nazemi || true
fi

export ALLOW_LOWMEM_BUILD=1
echo "→ ALLOW_LOWMEM_BUILD=1 npm run build (heap 1792 MB, cpus=1)"
npm run build

echo
echo "Done. Before start:"
echo "  ln -sfn \"\$(pwd)/media\" .next/standalone/media"
echo "  pm2 start nazemi   # or: ./start-standalone.sh"
echo "  pm2 save && sudo env PATH=\$PATH pm2 startup   # once, so reboot restores"
echo
echo "If this OOM'd: add 1–2 GiB swap (see DEPLOYMENT.md) or build on Mac."
