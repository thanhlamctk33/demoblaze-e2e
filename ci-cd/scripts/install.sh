#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ci-cd/scripts/install.sh [--browsers "chromium firefox webkit"] [--no-browsers] [--k6] [--k6-only]

  (default)      npm ci + all Playwright browsers with their OS dependencies
  --browsers     install only these browsers
  --no-browsers  skip browsers (e.g. inside the mcr.microsoft.com/playwright image)
  --k6           also install k6 (K6_VERSION, default v1.1.0; K6_INSTALL_DIR, default /usr/local/bin)
  --k6-only      install k6 only, skip npm and browsers
USAGE
}

BROWSERS=""
INSTALL_BROWSERS=true
INSTALL_K6=false
INSTALL_NPM=true
K6_VERSION="${K6_VERSION:-v1.1.0}"
K6_INSTALL_DIR="${K6_INSTALL_DIR:-/usr/local/bin}"

while [ $# -gt 0 ]; do
  case "$1" in
    --browsers) BROWSERS="$2"; shift 2 ;;
    --no-browsers) INSTALL_BROWSERS=false; shift ;;
    --k6) INSTALL_K6=true; shift ;;
    --k6-only) INSTALL_K6=true; INSTALL_NPM=false; INSTALL_BROWSERS=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

install_k6() {
  local os arch archive folder
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=macos ;;
    *) echo "Unsupported OS for k6: $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) arch=amd64 ;;
    aarch64|arm64) arch=arm64 ;;
    *) echo "Unsupported CPU for k6: $(uname -m)" >&2; exit 1 ;;
  esac
  folder="k6-${K6_VERSION}-${os}-${arch}"
  archive="$([ "$os" = linux ] && echo "${folder}.tar.gz" || echo "${folder}.zip")"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/grafana/k6/releases/download/${K6_VERSION}/${archive}" -o "${tmp}/${archive}"
  if [ "$os" = linux ]; then tar -xzf "${tmp}/${archive}" -C "$tmp"; else unzip -q "${tmp}/${archive}" -d "$tmp"; fi
  mkdir -p "$K6_INSTALL_DIR"
  mv "${tmp}/${folder}/k6" "${K6_INSTALL_DIR}/k6"
  rm -rf "$tmp"
  "${K6_INSTALL_DIR}/k6" version
}

if [ "$INSTALL_NPM" = true ]; then
  node --version
  npm ci
fi

if [ "$INSTALL_BROWSERS" = true ]; then
  read -r -a browser_list <<< "$BROWSERS"
  npx playwright install --with-deps ${browser_list[@]+"${browser_list[@]}"}
fi

if [ "$INSTALL_K6" = true ]; then
  install_k6
fi
