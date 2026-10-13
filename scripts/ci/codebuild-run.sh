#!/usr/bin/env bash
set -euo pipefail

TARGET="${TARGET:-chromium}"
GREP="${GREP:-all}"

if [ "$TARGET" = "quality" ]; then
  npm run lint
  npm run typecheck
  npm run format:check
  exit 0
fi

args=("--project=$TARGET")
[ "$TARGET" = "perf" ] && args+=("--no-deps")
[ -n "$GREP" ] && [ "$GREP" != "all" ] && args+=("--grep" "$GREP")

npx playwright test "${args[@]}"
