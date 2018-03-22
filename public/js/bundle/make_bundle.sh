#!/bin/bash
echo "(function(){" > bundle.js
/bin/cat ../cytoscape/dist/cytoscape.js | minify --js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../jquery/dist/jquery.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../webcola/WebCola/cola.min.js >> bundle.js
echo "\r\n" >> bundle.js
/bin/cat ../dagre/dist/dagre.min.js >> bundle.js
echo "\r\n" >> bundle.js
#/bin/cat ../cytoscape-cose-bilkent/cytoscape-cose-bilkent.js >> bundle.js
/bin/cat ../cytoscape-cose-bilkent/cytoscape-cose-bilkent.js | minify --js >> bundle.js
echo "})();" >> bundle.js