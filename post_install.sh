#!/bin/sh     
cd public/js/
rm -rf ./jbrowse.repo
ln -sf ../../node_modules/jbrowse ./jbrowse.repo
cd ./jbrowse.repo/plugins/
ln -sf ../../multibigwig ./

