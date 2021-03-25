#!/bin/sh     
cd public/js/
ln -sf ../../node_modules/jbrowse ./jbrowse.repo
cd ./jbrowse.repo/plugins/
ln -sf ../../multibigwig ./

