/**
 * External Libraries Bundle
 * Replaces bundle.js - contains cytoscape, jquery, webcola, dagre, etc.
 */

// Import libraries
import cytoscape from 'cytoscape';
import $ from 'jquery';
import dagre from 'dagre';

// Import cytoscape extensions from local paths
// Note: These are UMD modules that will self-register with cytoscape
import '../cytoscape-cose-bilkent/cytoscape-cose-bilkent.js';

// Load webcola from pre-built file
const cola = require('../webcola/WebCola/cola.min.js');

// Export to window for global access (needed by Dojo code)
window.cytoscape = cytoscape;
window.$ = window.jQuery = $;
window.dagre = dagre;
window.cola = cola;

console.log('[External Bundle] Loaded: cytoscape, jquery, dagre, cola, cytoscape-cose-bilkent');

// Export as module for potential future use
export { cytoscape, $, dagre, cola };
