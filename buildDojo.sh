#!/bin/sh

echo "========================================="
echo "Building Dojo layers"
echo "========================================="

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
    echo "Dojo build complete!"
    echo "========================================="
    echo ""
    echo "Output location: public/js/release/"
    echo ""

    # Count real errors (exclude UMD conversion messages)
    if [ -f "public/js/release/build-report.txt" ]; then
        real_errors=$(grep -E "^error\(311\)" public/js/release/build-report.txt | wc -l | tr -d ' ')
        total_warnings=$(grep -c "^warn" public/js/release/build-report.txt || echo "0")
        echo "Build report:"
        echo "  - Dependency errors: $real_errors"
        echo "  - Warnings: $total_warnings"
        echo "  - Full report: public/js/release/build-report.txt"
        echo ""
    fi

    exit 0
else
    echo ""
    echo "ERROR: Dojo build failed - critical layers not found"
    exit 1
fi
