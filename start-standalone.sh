#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
# Next standalone resolves cwd to .next/standalone — keep uploads reachable.
mkdir -p .next/standalone
ln -sfn "$(pwd)/media" .next/standalone/media

set -a
# shellcheck disable=SC1091
. ./.env
set +a
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
exec node .next/standalone/server.js
