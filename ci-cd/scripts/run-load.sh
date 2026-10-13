#!/usr/bin/env bash
set -euo pipefail

SCENARIO="${SCENARIO:-smoke}"
SCRIPT="${K6_SCRIPT:-perf/k6/checkout-flow.js}"
SUMMARY="reports/k6/$(basename "$SCRIPT" .js)-${SCENARIO}.json"

mkdir -p reports/k6
k6 run -e SCENARIO="$SCENARIO" --summary-export="$SUMMARY" "$SCRIPT"
