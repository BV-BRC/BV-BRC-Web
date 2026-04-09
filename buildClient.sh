#!/bin/sh

maxParam=""
if [ -f /proc/cpuinfo ] ; then
    cpus=`grep -c "^processor[[:space:]]*:" /proc/cpuinfo`
    if [ $cpus -gt 10 ] ; then
	maxParam="maxOptimizationProcesses=10"
    fi
fi

echo "Using maxParam: $maxParam"

cd public/js/
./util/buildscripts/build.sh --profile ./release.profile.js --release  $maxParam

echo "Finished Dojo build"

# Build a custom Auspice frontend bundle
cd auspice-custom || exit 1
echo "Building Auspice frontend..."
npx auspice build --extend ./extend/config.json

cd ../../../ || exit 1
echo "Done"
