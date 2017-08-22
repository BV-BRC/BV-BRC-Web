#!/bin/bash
echo "" > bundle.js
/bin/cat ../cytoscape/dist/cytoscape.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../jquery/dist/jquery.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../webcola/WebCola/cola.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../dagre/dist/dagre.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../cytoscape-cose-bilkent/cytoscape-cose-bilkent.js >> bundle.js
