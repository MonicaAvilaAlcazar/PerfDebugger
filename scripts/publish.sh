#!/usr/bin/env bash
#
# Package PerfDebugger for Chrome Web Store submission.
# Produces dist/perf-debugger-<version>.zip from manifest.json + icons/ + src/.
#
# Usage:
#   ./scripts/publish.sh              # build zip
#   ./scripts/publish.sh --clean      # remove dist/ first

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DIST_DIR="dist"
MANIFEST="manifest.json"
INCLUDE=(manifest.json icons src)

if [[ "${1:-}" == "--clean" ]]; then
  echo "Cleaning $DIST_DIR/"
  rm -rf "$DIST_DIR"
fi

# --- sanity checks ----------------------------------------------------------

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: $MANIFEST not found — run this script from the project root" >&2
  exit 1
fi

for path in "${INCLUDE[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "error: required path missing: $path" >&2
    exit 1
  fi
done

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' command not found" >&2
  exit 1
fi

# --- read version from manifest --------------------------------------------

VERSION="$(
  python3 -c "import json; print(json.load(open('$MANIFEST'))['version'])" 2>/dev/null \
  || sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST" | head -n1
)"

if [[ -z "$VERSION" ]]; then
  echo "error: could not read version from $MANIFEST" >&2
  exit 1
fi

# --- build ------------------------------------------------------------------

mkdir -p "$DIST_DIR"
ZIP_NAME="perf-debugger-${VERSION}.zip"
ZIP_PATH="${DIST_DIR}/${ZIP_NAME}"

# Remove any previous zip for this version so we always get a clean build
rm -f "$ZIP_PATH"

echo "Packaging PerfDebugger v${VERSION}"
echo "  -> $ZIP_PATH"

zip -r -q "$ZIP_PATH" "${INCLUDE[@]}" \
  -x "*.DS_Store" \
  -x "**/.DS_Store" \
  -x "**/*.map" \
  -x "**/__pycache__/*"

# --- verify -----------------------------------------------------------------

echo
echo "Contents:"
unzip -Z1 "$ZIP_PATH" | sed 's/^/  /'

SIZE_BYTES=$(wc -c < "$ZIP_PATH" | tr -d ' ')
SIZE_KB=$((SIZE_BYTES / 1024))

echo
echo "Size: ${SIZE_KB} KB"

# Chrome Web Store upload limit is 100 MB. Warn if we're ever close.
if (( SIZE_KB > 10240 )); then
  echo "warning: zip is larger than 10 MB — double-check for unwanted files" >&2
fi

# Fail loudly if anything forbidden slipped in
if unzip -l "$ZIP_PATH" | grep -E "store-assets/|\.md$|\.git/|node_modules/" >/dev/null; then
  echo "error: zip contains forbidden paths (docs, store assets, or git data)" >&2
  exit 1
fi

echo
echo "Done. Upload $ZIP_PATH at https://chrome.google.com/webstore/devconsole"
