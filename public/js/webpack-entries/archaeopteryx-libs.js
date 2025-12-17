/**
 * Archaeopteryx Libraries Bundle
 * Replaces bundle2.js - contains d3, phyloxml, and archaeopteryx dependencies
 *
 * Load these as raw scripts to preserve their global registration
 */

// These files need to be loaded in order and register themselves globally
// We use require() to ensure they execute in order

// D3 v3 (used by archaeopteryx)
require('../archaeopteryx/archaeopteryx-dependencies/d3.v3.min.js');

// SAX parser
require('../archaeopteryx/archaeopteryx-dependencies/sax.js');

// jQuery UI
require('../archaeopteryx/archaeopteryx-dependencies/jquery-ui.js');

// FileSaver
require('../archaeopteryx/archaeopteryx-dependencies/FileSaver.js');

// PhyloXML - Critical: must be loaded before forester/archaeopteryx
require('../archaeopteryx/archaeopteryx-dependencies/phyloxml.js');

// RGB Color (load from root js directory)
require('../rgbcolor.js');

// StackBlur
require('../archaeopteryx/archaeopteryx-dependencies/stackblur.js');

// CanVG will be loaded separately via script tag in javascript.ejs

// Archaeopteryx itself - depends on all the above
require('../archaeopteryx/archaeopteryx-js/forester.js');
require('../archaeopteryx/archaeopteryx-js/archaeopteryx.js');

// Verify critical globals are available
console.log('[Archaeopteryx Bundle] Checking globals...');
console.log('  - phyloXml:', typeof window.phyloXml !== 'undefined');
console.log('  - forester:', typeof window.forester !== 'undefined');
console.log('  - archaeopteryx:', typeof window.archaeopteryx !== 'undefined');
console.log('  - d3 (v3):', typeof window.d3 !== 'undefined');

export {};
