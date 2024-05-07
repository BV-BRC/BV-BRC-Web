#!/bin/sh
cd public/js/
cp dagre.js ./release/
rm -rf ./jbrowse.repo
ln -sf ../../node_modules/jbrowse ./jbrowse.repo
cd ./jbrowse.repo/plugins/
if [ ! -h MultiBigWig ]; then
  ln -s ../../../node_modules/MultiBigWig .
fi
