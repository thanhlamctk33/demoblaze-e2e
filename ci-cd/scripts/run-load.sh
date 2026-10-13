#!/usr/bin/env bash
set -euo pipefail

SCENARIO="${SCENARIO:-smoke}"
SCRIPT="${K6_SCRIPT:-perf/k6/checkout-flow.js}"

mkdir -p reports/k6
k6 run -e SCENARIO="$SCENARIO" --summary-export="reports/k6/checkout-${SCENARIO}.json" "$SCRIPT"
