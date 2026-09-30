#!/usr/bin/env bash
# Upload prebuilt Next standalone to novy. NEVER runs next build on the VPS.
#
# Usage (from Mac):
#   NEXT_PUBLIC_SERVER_URL=https://novy.nazemi.cz npm run build   # or build:fast
#   ./scripts/deploy-standalone.sh
#   SKIP_BUILD=1 ./scripts/deploy-standalone.sh   # pack existing .next only
#
# Env: NOVY_SSH_* from ~/.config/nazemi/novy-ssh.env (or key auth).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f "${HOME}/.config/nazemi/novy-ssh.env" ]]; then
  # shellcheck disable=SC1091
  set -a && . "${HOME}/.config/nazemi/novy-ssh.env" && set +a
fi

HOST="${NOVY_SSH_HOST:-vps.nazemi.cz}"
USER="${NOVY_SSH_USER:-nazemi-novy}"
PORT="${NOVY_SSH_PORT:-22}"
# Local env may use NOVY_SSH_PASSWORD (quoted); normalize.
PASS="${NOVY_SSH_PASS:-${NOVY_SSH_PASSWORD:-}}"
PASS="${PASS%\'}"
PASS="${PASS#\'}"
PASS="${PASS%\"}"
PASS="${PASS#\"}"
APP_DIR="${NOVY_APP_DIR:-nazemi}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TGZ="/tmp/nazemi-standalone-${STAMP}.tgz"

ssh_cmd() {
  if [[ -n "$PASS" ]] && command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$PASS" sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no -p "$PORT" "$USER@$HOST" "$@"
  else
    ssh -o StrictHostKeyChecking=accept-new -p "$PORT" "$USER@$HOST" "$@"
  fi
}

scp_cmd() {
  if [[ -n "$PASS" ]] && command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$PASS" sshpass -e scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no -P "$PORT" "$@"
  else
    scp -o StrictHostKeyChecking=accept-new -P "$PORT" "$@"
  fi
}

if [[ "${SKIP_BUILD:-}" != "1" && ! -f .next/standalone/server.js ]]; then
  echo "→ no standalone yet; running npm run build (lowmem-safe, local)"
  npm run build
fi

if [[ ! -f .next/standalone/server.js ]]; then
  echo "error: missing .next/standalone/server.js — build on Mac first" >&2
  exit 1
fi

# Next standalone needs static + public beside server.js.
mkdir -p .next/standalone/.next
if [[ -d .next/static ]]; then
  rm -rf .next/standalone/.next/static
  cp -R .next/static .next/standalone/.next/static
fi
if [[ -d public ]]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi
# Never ship uploads inside the tarball.
rm -rf .next/standalone/media

echo "→ packing lean tarball → $TGZ"
COPYFILE_DISABLE=1 tar -C .next -czf "$TGZ" standalone
ls -lh "$TGZ"

REMOTE_TGZ="/tmp/nazemi-standalone-${STAMP}.tgz"
echo "→ upload $USER@$HOST:$REMOTE_TGZ"
scp_cmd "$TGZ" "$USER@$HOST:$REMOTE_TGZ"

echo "→ extract + media symlink + pm2 restart (no remote next build)"
# shellcheck disable=SC2087
ssh_cmd bash -s <<EOF
set -euo pipefail
cd ~/${APP_DIR}
mkdir -p .next
rm -rf .next/standalone
tar -C .next -xzf "$REMOTE_TGZ"
ln -sfn "\$(pwd)/media" .next/standalone/media
test -f .next/standalone/server.js
export PATH="\$HOME/.nvm/versions/node/v22.23.2/bin:\$PATH"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart nazemi || pm2 start ./start-standalone.sh --name nazemi
  pm2 save || true
else
  echo "warn: pm2 not in PATH — start manually: ./start-standalone.sh"
fi
rm -f "$REMOTE_TGZ"
echo "OK deploy ${STAMP}"
EOF

echo "Done. Smoke: curl -sI https://novy.nazemi.cz/ | head -1"
