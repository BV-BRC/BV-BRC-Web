// Grids layer - base grid components + shared grid containers
// Shared grid containers are used by multiple viewers or base viewer classes (_GenomeList, _FeatureList)
// Viewer-specific Grid and GridContainer modules will be bundled per-viewer
define([
  // Base grid components
  'p3/widget/Grid',
  'p3/widget/GridContainer',
  'p3/widget/PageGrid',
  'p3/widget/GridSelector',
  'p3/widget/GridCopyToClipboard',

  // Shared grid containers (used by multiple viewers or base viewer classes)
  'p3/widget/FeatureGridContainer',
  'p3/widget/FeatureGrid',
  'p3/widget/GenomeGridContainer',
  'p3/widget/GenomeGrid',
  'p3/widget/ProteinGridContainer',
  'p3/widget/ProteinGrid',
  'p3/widget/AMRPanelGridContainer',
  'p3/widget/AMRPanelGrid',
  'p3/widget/SpecialtyGeneGridContainer',
  'p3/widget/SpecialtyGeneGrid',
  'p3/widget/SequenceGridContainer',
  'p3/widget/SequenceGrid',
  'p3/widget/PathwayGridContainer',
  'p3/widget/PathwayGrid',
  'p3/widget/SubsystemGridContainer',
  'p3/widget/SubsystemGrid',
  'p3/widget/ExperimentsContainer',
  'p3/widget/InteractionContainer',
  'p3/widget/ProteinStructureGridContainer',
  'p3/widget/ProteinStructureGrid',
  'p3/widget/ProteinFeaturesGridContainer',
  'p3/widget/ProteinFeaturesGrid',
  'p3/widget/CompareRegionContainer'
], function() {
  return {};
});
