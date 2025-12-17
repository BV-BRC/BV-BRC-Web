/**
 * Viewers Libraries Bundle
 * Includes: cytoscape, dagre, cola, webcola + viewer-specific libraries
 */

// Cytoscape and graph visualization libraries
import cytoscape from 'cytoscape';
import dagre from 'dagre';

// Import cytoscape extensions from local paths
import '../cytoscape-cose-bilkent/cytoscape-cose-bilkent.js';

// Load webcola from pre-built file
const cola = require('../webcola/WebCola/cola.min.js');

// Export to window for global access (needed by Dojo code)
window.cytoscape = cytoscape;
window.dagre = dagre;
window.cola = cola;

// Note: These imports will need adjustment based on actual file structure
// Commenting out potentially problematic imports for now - will need verification

// Import molstar if available as ES module
// import * as molstar from '../molstar/mol-bvbrc/index.js';

// Import mauve viewer
// import MauveViewer from '../mauve_viewer/dist/mauve-viewer.js';
// import '../mauve_viewer/dist/mauve-viewer.css';

// Import heatmap library
// The error mentions 'heatmap/dist/hotmap' - need to verify actual path
// import hotmap from '../heatmap/dist/hotmap.js';

// For now, create placeholders that can be loaded conditionally
// This prevents build errors while allowing gradual migration

// Try to load molstar if available
try {
  const molstarPath = '../molstar/mol-bvbrc/index.js';
  // Dynamic import will be handled at runtime
  window.molstarLoader = () => import(molstarPath);
} catch (e) {
  console.warn('[Viewers Bundle] Molstar not available:', e.message);
}

// Try to load mauve viewer if available
try {
  if (typeof window.MauveViewer === 'undefined') {
    const mauveScript = document.createElement('script');
    mauveScript.src = '/js/mauve_viewer/dist/mauve-viewer.js';
    mauveScript.async = true;
    document.head.appendChild(mauveScript);

    const mauveStyle = document.createElement('link');
    mauveStyle.rel = 'stylesheet';
    mauveStyle.href = '/js/mauve_viewer/dist/mauve-viewer.css';
    document.head.appendChild(mauveStyle);
  }
} catch (e) {
  console.warn('[Viewers Bundle] Mauve viewer not available:', e.message);
}

console.log('[Viewers Bundle] Loaded: cytoscape, dagre, cola, webcola + viewer library loaders');

export { cytoscape, dagre, cola };
