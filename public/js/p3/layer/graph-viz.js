// Graph visualization layer - loaded when viewers need interaction graphs
// Contains widgets that depend on cytoscape and related graph libraries

// Import graph visualization libraries from node_modules
import cytoscape from 'cytoscape';
import dagre from 'dagre';
import cola from 'webcola';
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeCola from 'cytoscape-cola';
import cytoscapeDagre from 'cytoscape-dagre';

// Register cytoscape extensions
cytoscapeCoseBilkent(cytoscape);
cytoscapeCola(cytoscape, cola);
cytoscapeDagre(cytoscape, dagre);

// Export to window for global access (needed by widgets)
if (typeof window !== 'undefined') {
  window.cytoscape = cytoscape;
  window.dagre = dagre;
  window.cola = cola;
}

// Load graph visualization widgets that depend on these libraries
define([
  'dojo/ready',
  'p3/widget/InteractionGraphContainer',
  'p3/widget/InteractionContainer'
], function(ready, InteractionGraphContainer, InteractionContainer) {
  console.log('[Graph Viz Layer] Loaded graph visualization libraries and widgets');

  return {
    InteractionGraphContainer: InteractionGraphContainer,
    InteractionContainer: InteractionContainer
  };
});
