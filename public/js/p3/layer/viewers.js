// Viewers base layer - common viewer infrastructure only
// Specific viewer widgets are loaded from their own separate bundles
// Graph visualization (cytoscape) is in p3/layer/graph-viz
// Shared viewer base classes (_GenomeList, _FeatureList) are included here

define([
  'dojo/ready',
  'dojox/gfx/svg',
  'dojox/gfx/path',
  'p3/widget/viewer/Base',
  'p3/widget/viewer/TabViewerBase',
  'p3/widget/viewer/_GenomeList',
  'p3/widget/viewer/_FeatureList',
  'p3/widget/TabContainer',
  'p3/widget/formatter',
  'p3/widget/DataItemFormatter',
  'p3/widget/ActionBar',
  'p3/widget/FilterContainerActionBar',
  'p3/widget/ItemDetailPanel',
  'p3/widget/SelectionToGroup',
  'p3/widget/PerspectiveToolTip',
  'p3/widget/ProteinFeatureSummary',
  'p3/widget/GenomeOverview',
  'p3/widget/FeatureOverview',
  'p3/widget/CircularViewerContainer',
  'p3/widget/ProteinFamiliesContainer',
  'p3/widget/PathwaysContainer',
  'p3/widget/SubSystemsContainer',
  'p3/widget/ExperimentsContainer',
  // 'p3/widget/Phylogeny', // REMOVED: Large widget (791 lines), uses d3/phyloview, only needed by specific viewers
  'p3/widget/TaxonomyOverview',
  'dojox/widget/Standby',
  'dijit/MenuItem',
  'dijit/TooltipDialog',
  'dijit/popup',
  'dojox/xml/DomParser',
  'dojox/dtl/_Templated',
  'dojox/dtl/_base',
  'dojox/string/tokenize',
  'dojox/string/Builder',
  // 'phyloview/TreeNavSVG', // REMOVED: Only needed by Phylogeny widget which was removed from this layer
  'FileSaver'
], function() {
  return {};
});
