// Shared graph/grid helper layer to de-duplicate modules between grids and graph-viz.
// Pulls in webcola, shared containers, and cross-cutting widgets.
import cola from 'webcola';

if (typeof window !== 'undefined') {
  window.cola = cola;
}

define([
  // Shared widget plumbing used by both grids and graph visualizations
  'p3/widget/DataItemFormatter',
  'p3/widget/GridContainer',
  'p3/widget/AdvancedSearchFields',
  'p3/widget/FilterContainerActionBar',
  'p3/widget/app/AppBase',
  'p3/widget/app/PhylogeneticTree',
  'p3/widget/app/Homology',
  'p3/widget/app/MSA',
  'p3/widget/app/PrimerDesign',
  'dojo/text!p3/widget/app/templates/PrimerDesign.html',
  'p3/widget/WorkspaceObjectSelector',
  'dgrid/List'
], function() {
  return {};
});
