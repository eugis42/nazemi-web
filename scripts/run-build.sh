#!/usr/bin/env bash
# Default = lowmem-safe (cpus:1, heap 1792). Mac parallel = --fast.
set -euo pipefail
cd "$(dirname "$0")/.."

FAST=0
if [[ "${1:-}" == "--fast" ]]; then
  FAST=1
fi

if (( FAST )); then
  bash scripts/assert-not-vps-build.sh fat
  echo "→ build:fast (heap 8000, parallel workers)"
  exec cross-env NODE_OPTIONS="--no-deprecation --max-old-space-size=8000" next build
fi

bash scripts/assert-not-vps-build.sh lowmem
echo "→ build lowmem-safe (heap 1792, NEXT_BUILD_LOWMEM=1 → cpus:1)"
exec cross-env NEXT_BUILD_LOWMEM=1 NODE_OPTIONS="--no-deprecation --max-old-space-size=1792" next build
