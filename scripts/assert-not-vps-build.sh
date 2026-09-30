#!/usr/bin/env bash
# Refuse fat / casual builds on low-RAM Linux (novy = 4 GiB).
# Modes:
#   fat     — default for `npm run build:fast`. Abort if MemTotal < 6 GiB
#             unless ALLOW_FAT_BUILD=1.
#   lowmem  — default for `npm run build`. Abort if MemTotal < 6 GiB
#             unless ALLOW_LOWMEM_BUILD=1 (emergency; prefer Mac upload).
set -euo pipefail

MODE="${1:-lowmem}"
MIN_KIB=$((6 * 1024 * 1024)) # ~6 GiB

# Non-Linux (macOS etc.): no MemTotal — allow (unless TEST_MEM_TOTAL_KIB set).
if [[ -n "${TEST_MEM_TOTAL_KIB:-}" ]]; then
  MEM_TOTAL_KIB="$TEST_MEM_TOTAL_KIB"
elif [[ -r /proc/meminfo ]]; then
  MEM_TOTAL_KIB="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
else
  exit 0
fi
if [[ -z "${MEM_TOTAL_KIB}" ]]; then
  exit 0
fi

if (( MEM_TOTAL_KIB >= MIN_KIB )); then
  exit 0
fi

MEM_GIB="$(awk -v k="$MEM_TOTAL_KIB" 'BEGIN { printf "%.1f", k/1024/1024 }')"

case "$MODE" in
  fat)
    if [[ "${ALLOW_FAT_BUILD:-}" == "1" ]]; then
      echo "warn: ALLOW_FAT_BUILD=1 — fat build on ${MEM_GIB} GiB box (likely OOM)." >&2
      exit 0
    fi
    cat >&2 <<EOF
REFUSE: fat Next build on low-RAM host (${MEM_GIB} GiB < 6 GiB).
This OOM'd novy.nazemi.cz (4 GiB, no swap) on 2026-09-30.

Sanctioned paths:
  (A) Build on Mac/CI → ./scripts/deploy-standalone.sh
  (B) Emergency on VPS: stop app + swap, then:
        ALLOW_LOWMEM_BUILD=1 npm run build
      or: ./scripts/build-on-server.sh

Override (dangerous): ALLOW_FAT_BUILD=1 npm run build:fast
EOF
    exit 1
    ;;
  lowmem|*)
    if [[ "${ALLOW_LOWMEM_BUILD:-}" == "1" ]]; then
      echo "→ ALLOW_LOWMEM_BUILD=1 — lowmem build on ${MEM_GIB} GiB (stop pm2 + prefer swap)." >&2
      exit 0
    fi
    cat >&2 <<EOF
REFUSE: npm run build on low-RAM host (${MEM_GIB} GiB < 6 GiB).
Even lowmem Next+Payload wants ~1–2 GiB; building while the app is up can OOM the CT.

Sanctioned paths:
  (A) Mac/CI: npm run build && ./scripts/deploy-standalone.sh
  (B) Emergency VPS: ./scripts/build-on-server.sh
      (stops pm2, sets ALLOW_LOWMEM_BUILD=1, heap 1792, cpus=1)

Docs: DEPLOYMENT.md
EOF
    exit 1
    ;;
esac
