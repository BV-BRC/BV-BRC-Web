#!/bin/sh
cd public/js/
rm -rf ./jbrowse.repo
ln -sf ../../node_modules/jbrowse ./jbrowse.repo
cd ./jbrowse.repo/plugins/
if [ -f MultiBigWig ]; then
  ln -s ../../../node_modules/MultiBigWig .
fi
