#!/bin/sh

# ============================================================================
# Archaeopteryx pin
#
# To bump the bundled archaeopteryx version, edit ARCHAEOPTERYX_SHA below to
# the desired commit from https://github.com/cmzmasek/archaeopteryx-js and
# commit this file. The next build will:
#   1. Check out that SHA inside the archaeopteryx-js submodule
#   2. Regenerate public/js/bundle/bundle2.js from it
# ============================================================================
ARCHAEOPTERYX_SHA="d001ea1a75c81ca05b382d710e4371f412e392d1"

maxParam=""
if [ -f /proc/cpuinfo ] ; then
    cpus=`grep -c "^processor[[:space:]]*:" /proc/cpuinfo`
    if [ $cpus -gt 10 ] ; then
	maxParam="maxOptimizationProcesses=10"
    fi
fi

echo "Using maxParam: $maxParam"

# Ensure the archaeopteryx-js submodule directory exists (no-op on subsequent builds)
git submodule update --init public/js/archaeopteryx/archaeopteryx-js || exit 1

# Sync archaeopteryx-js to ARCHAEOPTERYX_SHA only if it's not already there
ARCHY_DIR=public/js/archaeopteryx/archaeopteryx-js
CURRENT_SHA=$(cd "$ARCHY_DIR" && git rev-parse HEAD)
if [ "$CURRENT_SHA" != "$ARCHAEOPTERYX_SHA" ]; then
    echo "Archaeopteryx at $CURRENT_SHA; checking out pinned $ARCHAEOPTERYX_SHA..."
    (cd "$ARCHY_DIR" && git fetch origin && git checkout "$ARCHAEOPTERYX_SHA") || exit 1
else
    echo "Archaeopteryx already at pinned SHA $ARCHAEOPTERYX_SHA"
fi

# The bundler skips regeneration when its script and input contents match.
sh public/js/bundle/make_bundle2.sh --if-needed || exit 1

cd public/js/
./util/buildscripts/build.sh --profile ./release.profile.js --release  $maxParam

echo "Finished Dojo build"

# Build a custom Auspice frontend bundle
cd auspice-custom || exit 1
echo "Building Auspice frontend..."
npx auspice build --extend ./extend/config.json

cd ../../../ || exit 1
echo "Done"
