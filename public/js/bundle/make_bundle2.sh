#!/bin/sh

set -e
cd "$(dirname "$0")"

# These lists drive both the freshness check and bundle generation.
COMMON_INPUTS="
../archaeopteryx/archaeopteryx-dependencies/d3.v3.min.js
../archaeopteryx/archaeopteryx-dependencies/sax.js
../archaeopteryx/archaeopteryx-dependencies/jquery-ui.js
../archaeopteryx/archaeopteryx-dependencies/FileSaver.js
../archaeopteryx/archaeopteryx-dependencies/phyloxml.js
../rgbcolor.js
../archaeopteryx/archaeopteryx-dependencies/stackblur.js
../archaeopteryx/archaeopteryx-dependencies/canvg.js
"
ARCHAEOPTERYX_INPUTS="
../archaeopteryx/archaeopteryx-js/docs/lib/d3.v7.min.js
../archaeopteryx/archaeopteryx-js/forester.js
../archaeopteryx/archaeopteryx-js/archaeopteryx.js
"

case "${1:-}" in
    ""|--if-needed) ;;
    *) echo "Usage: $0 [--if-needed]" >&2; exit 1 ;;
esac

# Content hashes work across checkouts, where timestamps can be misleading.
# sha256sum is available on Linux; shasum is provided by macOS.
hash_inputs() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$@"
    else
        shasum -a 256 "$@"
    fi
}
# Word splitting is intentional: these are fixed, whitespace-free paths.
INPUT_HASHES=$(hash_inputs make_bundle2.sh $COMMON_INPUTS $ARCHAEOPTERYX_INPUTS)
BUNDLE_HASH=$(printf '%s\n' "$INPUT_HASHES" | hash_inputs)
BUNDLE_MARKER="// bundle2 inputs: ${BUNDLE_HASH%% *}"
if [ "${1:-}" = "--if-needed" ] && [ -f bundle2.js ] &&
    [ "$(tail -n 1 bundle2.js)" = "$BUNDLE_MARKER" ]; then
    echo "bundle2.js is up to date; skipping regeneration"
    exit 0
fi

echo "Regenerating bundle2.js..."
# Leave the previous bundle intact if any input cannot be read.
BUNDLE_TEMP=$(mktemp ./bundle2.js.XXXXXX)
trap 'rm -f "$BUNDLE_TEMP"' EXIT
cat $COMMON_INPUTS > "$BUNDLE_TEMP"

# Archaeopteryx 3 captures D3 v7 at initialization. Keep the global D3 v3
# instance for legacy widgets; v7 must start with a fresh object because its
# UMD loader otherwise merges into (and corrupts) the existing global.
cat >> "$BUNDLE_TEMP" <<'JS'

;(function (root) {
  var legacyD3 = root.d3;
  try {
    root.d3 = {};
JS

cat $ARCHAEOPTERYX_INPUTS >> "$BUNDLE_TEMP"

cat >> "$BUNDLE_TEMP" <<'JS'

  } finally {
    root.d3 = legacyD3;
  }
})(window);
JS
printf '%s\n' "$BUNDLE_MARKER" >> "$BUNDLE_TEMP"
chmod 644 "$BUNDLE_TEMP"
mv "$BUNDLE_TEMP" bundle2.js
