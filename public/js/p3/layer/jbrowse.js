// JBrowse layer - loaded on demand when using JBrowse genome browser
// Sets up JBrowse core modules and exports JBrowse.Browser to window
// Widgets that depend on JBrowse (like GenomeBrowser) will be loaded later by viewer bundles
define([
  'dojo/ready',
  'JBrowse/Browser',
  'JBrowse/ConfigAdaptor/conf',
  'JBrowse/ConfigAdaptor/JB_json_v1',
  'JBrowse/Plugin',
  'JBrowse/Store/TrackMetaData',
  'JBrowse/View/TrackList/Hierarchical',
  'JBrowse/View/TrackList/_TextFilterMixin',
  'JBrowse/Store/Names/REST',
  'JBrowse/Store/Names/Hash',
  'JBrowse/Store/SeqFeature/REST',
  'JBrowse/Store/SeqFeature/NCList',
  'JBrowse/Store/Sequence/StaticChunked',
  'JBrowse/Store/TiledImage/Fixed',
  'JBrowse/Store/SeqFeature',
  'JBrowse/Store',
  'JBrowse/Model/SimpleFeature',
  'JBrowse/View/Track/HTMLFeatures',
  'JBrowse/View/Track/Sequence',
  'JBrowse/View/Track/FixedImage/Wiggle',
  'JBrowse/View/Track/Wiggle',
  'JBrowse/View/Track/Wiggle/XYPlot',
  'JBrowse/View/Track/Wiggle/Density',
  'JBrowse/View/Track/Alignments',
  'JBrowse/View/Track/Alignments2',
  'JBrowse/View/Track/FeatureCoverage',
  'JBrowse/View/Track/SNPCoverage',
  'JBrowse/View/FeatureGlyph/Box',
  'JBrowse/View/FeatureGlyph/Gene',
  'JBrowse/View/FeatureGlyph/Diamond',
  'JBrowse/View/FeatureGlyph/Alignment',
  'JBrowse/View/FeatureGlyph/Segments',
  'JBrowse/View/FeatureGlyph/ProcessedTranscript',
  'JBrowse/View/Ruler',
  'JBrowse/View/FASTA',
  'jbrowse.repo/plugins/HideTrackLabels/js/main',
  'jbrowse.repo/plugins/MultiBigWig/js/main',
  'jbrowse.repo/plugins/MultiBigWig/js/Store/SeqFeature/MultiBigWig',
  'jbrowse.repo/plugins/RegexSequenceSearch/js/main',
  'jbrowse.repo/plugins/RegexSequenceSearch/js/View/SearchSeqDialog',
  'jbrowse.repo/plugins/RegexSequenceSearch/js/Store/SeqFeature/RegexSearch',
  'p3/widget/HierarchicalTrackList',
  'p3/widget/GenomeBrowser',
  'p3/store/SeqFeatureREST',
  'dojo/text!p3/widget/templates/GenomeBrowserError.html'
], function(ready, JBrowseBrowser, HideTrackLabelsPlugin, MultiBigWigPlugin, MultiBigWigStore, RegexSequenceSearchPlugin, RegexSearchDialog, RegexSearchStore, HierarchicalTrackList, GenomeBrowser, SeqFeatureREST, GenomeBrowserErrorTemplate) {
  ready(function() {
    if (typeof window !== 'undefined') {
      window.JBrowse = window.JBrowse || {};
      window.JBrowse.Browser = JBrowseBrowser;
      window.JBrowse.HierarchicalTrackList = HierarchicalTrackList;
      window.JBrowse.GenomeBrowser = GenomeBrowser;
      window.JBrowse.GenomeBrowserErrorTemplate = GenomeBrowserErrorTemplate;
      // expose bundled plugins for runtime access
      window.JBrowsePlugins = window.JBrowsePlugins || {};
      window.JBrowsePlugins.HideTrackLabels = HideTrackLabelsPlugin;
      window.JBrowsePlugins.MultiBigWig = MultiBigWigPlugin;
      window.JBrowsePlugins.RegexSequenceSearch = RegexSequenceSearchPlugin;
      window.JBrowsePlugins.MultiBigWigStore = MultiBigWigStore;
    }
  });
  return {};
});
