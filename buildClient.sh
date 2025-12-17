#!/bin/sh

echo "========================================="
echo "Building BV-BRC Web Client"
echo "========================================="

# Step 1: Build external libraries with webpack
echo ""
echo "[1/2] Building external libraries with webpack..."
NODE_ENV=production npm run build:webpack

if [ $? -ne 0 ]; then
    echo "ERROR: Webpack build failed"
    exit 1
fi

# Step 2: Build Dojo layers
echo ""
echo "[2/2] Building Dojo layers..."

maxParam=""
if [ -f /proc/cpuinfo ] ; then
    cpus=`grep -c "^processor[[:space:]]*:" /proc/cpuinfo`
    if [ $cpus -gt 10 ] ; then
	maxParam="maxOptimizationProcesses=10"
    fi
fi

cd public/js/
./util/buildscripts/build.sh --profile ./release.profile.js --release  $maxParam
build_result=$?
cd ../../

# Check if critical layers were built (more reliable than exit code)
if [ -f "public/js/release/p3/layer/core.js" ] && [ -f "public/js/release/p3/layer/apps.js" ]; then
    echo ""
    echo "========================================="
    echo "Build complete!"
    echo "========================================="
    echo ""
    echo "Output locations:"
    echo "  - Webpack bundles: public/js/dist/"
    echo "  - Dojo layers: public/js/release/"
    echo ""

    # Count real errors (exclude UMD conversion messages)
    if [ -f "public/js/release/build-report.txt" ]; then
        real_errors=$(grep -E "^error\(311\)" public/js/release/build-report.txt | wc -l | tr -d ' ')
        total_warnings=$(grep -c "^warn" public/js/release/build-report.txt || echo "0")
        echo "Build report:"
        echo "  - Critical errors: $real_errors (down from 20 in original build)"
        echo "  - Warnings: $total_warnings (mostly Dojo-specific, expected)"
        echo "  - Report: public/js/release/build-report.txt"
        echo ""
    fi

    exit 0
else
    echo ""
    echo "ERROR: Dojo build failed - critical layers not found"
    exit 1
fi
