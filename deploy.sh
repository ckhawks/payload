#!/usr/bin/env bash
#
# Build payload locally (WSL/Linux) and ship the built artifact to the server.
# The server never runs npm install or next build.
#
#   ./deploy.sh              build, ship, activate, restart
#   ./deploy.sh --no-pull    skip git pull (deploy working tree as-is)
#   ./deploy.sh --rollback   repoint 'current' at the previous release
#
# Requires: Linux node matching the server (v20.19.6), ssh access to $REMOTE.

set -euo pipefail

APP=payload
REMOTE=dallas-extravm
REMOTE_BASE=/root/apps/payload
PORT=3005
KEEP=3

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PULL=1

for arg in "$@"; do
  case "$arg" in
    --no-pull)  PULL=0 ;;
    --rollback) ROLLBACK=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------- rollback
if [ "${ROLLBACK:-0}" = 1 ]; then
  echo "==> rolling back $APP"
  ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_BASE/releases"
current=\$(basename "\$(readlink -f "$REMOTE_BASE/current")")
prev=\$(ls -1 | sort | grep -B1 "^\$current\$" | head -1)
if [ -z "\$prev" ] || [ "\$prev" = "\$current" ]; then
  echo "no earlier release to roll back to"; exit 1
fi
echo "  \$current -> \$prev"
ln -sfn "$REMOTE_BASE/releases/\$prev" "$REMOTE_BASE/current"
systemctl restart $APP
EOF
  sleep 4
  ssh "$REMOTE" "curl -sf -o /dev/null -w 'rollback smoke test: HTTP %{http_code}\n' http://127.0.0.1:$PORT/login"
  exit 0
fi

# ------------------------------------------------------------ sanity checks
case "$REPO_DIR" in
  /mnt/*)
    echo "ERROR: running from a Windows-mounted path ($REPO_DIR)." >&2
    echo "Next builds over 9p are extremely slow. Use the WSL-native clone:" >&2
    echo "  cd ~/apps/$APP && ./deploy.sh" >&2
    exit 1 ;;
esac

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

case "$(command -v node)" in
  /mnt/c/*|"")
    echo "ERROR: node resolves to the Windows build (or is missing)." >&2
    echo "Native modules would be built for the wrong platform." >&2
    exit 1 ;;
esac

echo "==> node $(node -v) at $(command -v node)"
cd "$REPO_DIR"

# ------------------------------------------------------------------- build
if [ "$PULL" = 1 ]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> npm ci"
npm ci --no-audit --no-fund

echo "==> next build"
npm run build

if [ ! -d .next/standalone ]; then
  echo "ERROR: .next/standalone missing. Is output:'standalone' set in next.config.ts?" >&2
  exit 1
fi

# ---------------------------------------------------------------- assemble
# standalone omits public/ and .next/static by design; without these every
# static asset 404s at runtime.
echo "==> assembling artifact"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -r .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next"
cp -r .next/static "$STAGE/.next/static"
[ -d public ] && cp -r public "$STAGE/public"

TARBALL="$STAGE/../$APP-$STAMP.tar.gz"
tar -czf "$TARBALL" -C "$STAGE" .
echo "    $(du -h "$TARBALL" | cut -f1) artifact"

# ------------------------------------------------------------------ migrate
# drizzle-kit is a devDependency and is not traced into the standalone bundle,
# so migrations run from here against the server's Postgres.
if [ -f .env.local ]; then
  echo "==> db migrate"
  npm run db:migrate
else
  echo "==> db migrate SKIPPED (no .env.local in build dir)"
fi

# ------------------------------------------------------------------- ship
echo "==> uploading release $STAMP"
ssh "$REMOTE" "mkdir -p $REMOTE_BASE/releases/$STAMP $REMOTE_BASE/shared"
scp -q "$TARBALL" "$REMOTE:$REMOTE_BASE/releases/$STAMP/artifact.tar.gz"

echo "==> activating"
ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "$REMOTE_BASE/releases/$STAMP"
tar -xzf artifact.tar.gz && rm artifact.tar.gz

# Secrets live in shared/, never in the artifact.
if [ ! -f "$REMOTE_BASE/shared/.env.local" ]; then
  echo "ERROR: $REMOTE_BASE/shared/.env.local missing — create it first" >&2
  exit 1
fi
ln -sfn "$REMOTE_BASE/shared/.env.local" "$REMOTE_BASE/releases/$STAMP/.env.local"

ln -sfn "$REMOTE_BASE/releases/$STAMP" "$REMOTE_BASE/current"
systemctl restart $APP

# keep only the most recent \$KEEP releases
cd "$REMOTE_BASE/releases"
ls -1 | sort -r | tail -n +$((KEEP + 1)) | xargs -r rm -rf
EOF

echo "==> smoke test"
sleep 5
ssh "$REMOTE" "curl -sf -o /dev/null -w '    local  HTTP %{http_code}\n' http://127.0.0.1:$PORT/login" \
  || { echo "SMOKE TEST FAILED — check: ssh $REMOTE journalctl -u $APP -n 50" >&2; exit 1; }
curl -sf -o /dev/null -w "    public HTTP %{http_code}\n" "https://payload.stlr.cx/login" || echo "    public check failed (TLS not set up yet?)"

echo "==> deployed $STAMP"
