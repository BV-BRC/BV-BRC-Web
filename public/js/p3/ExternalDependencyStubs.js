/**
 * External Dependency Stubs for Dojo Build
 * 
 * This file provides stub AMD module definitions for external libraries
 * that are loaded via webpack bundles. This prevents the Dojo build tool
 * from throwing errors about missing dependencies.
 * 
 * These stubs return references to the global objects set by webpack bundles.
 */

// Heatmap library stub (used by multiple widgets)
define('heatmap/dist/hotmap', [], function() {
  return window.hotmap || window.Heatmap || {};
});

// Markdown-it stub (used by copilot widgets)
define('markdown-it/dist/markdown-it.min', [], function() {
  return window.markdownit || {};
});

// HTML2Canvas stub (used by copilot input widgets)
define('html2canvas/dist/html2canvas.min', [], function() {
  return window.html2canvas || {};
});

// Molstar stub (used by protein structure viewer)
define('molstar/mol-bvbrc/index', [], function() {
  return window.molstar || {};
});

// Mauve viewer stub (used by genome alignment)
define('mauve_viewer/dist/mauve-viewer', [], function() {
  return window.MauveViewer || {};
});

// Dagre stub - NO DEPENDENCIES to avoid circular refs
define('dagre', [], function() {
  return window.dagre || {};
});

// Cytoscape-dagre stub - NO DEPENDENCIES to avoid circular refs
define('cytoscape-dagre/cytoscape-dagre', [], function() {
  // Return the cytoscape extension function if available
  return window.cytoscapeDagre || function() {};
});

// Google Maps API stub (external URL - runtime loaded)
define('https://maps.googleapis.com/maps/api/js?key=AIzaSyAo6Eq83tcpiWufvVpw_uuqdoRfWbFXfQ8&sensor=false&libraries=drawing', [], function() {
  return window.google || {};
});

// CSS file stubs (xstyle plugin tries to load these)
define('xstyle/css!molstar/mol-bvbrc/molstar.css', [], function() {
  return {};
});

define('xstyle/css!mauve_viewer/dist/mauve-viewer.css', [], function() {
  return {};
});

console.log('[Dojo Stubs] External dependency stubs loaded');
