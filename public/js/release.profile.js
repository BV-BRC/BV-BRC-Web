var profile = {
  basePath: './',
  layerOptimize: 'closure',
  optimizeOptions: {
    languageIn: 'ECMASCRIPT_2018',
    languageOut: 'ECMASCRIPT_2018',
    compilationLevel: 'SIMPLE'
  },
  cssOptimize: 'comments.keepLines',
  releaseDir: './release',
  stripConsole: 'all',
  mini: true,
  hasReport: true,
  selectorEngine: 'lite',
  staticHasFeatures: {
    'dojo-firebug': false,
    'dojo-debug-messages': true,
    'dojo-trace-api': false,
    'dojo-log-api': true,
    'async': true
  },
  plugins: {
    'xstyle/css': 'xstyle/build/amd-css'
  },
  packages: [
    { name: 'dojo', location: './dojo' },
    { name: 'dijit', location: './dijit' },
    { name: 'dojox', location: './dojox' },
    { name: 'p3', location: './p3' },
    { name: 'dgrid', location: './dgrid' },
    { name: 'put-selector', location: './put-selector' },
    { name: 'xstyle', location: './xstyle' },
    { name: 'dbind', location: './dbind' },
    { name: 'rql', location: './rql' },
    { name: 'JBrowse', location: './JBrowse' },
    { name: 'jszlib', location: './jszlib' },
    { name: 'FileSaver', location: './FileSaver', main: 'FileSaver' },
    { name: 'circulus', location: './circulus' },
    { name: 'lazyload', location: './lazyload/', main: 'lazyload' },
    { name: 'jDataView', location: './jDataView/src', main: 'jdataview' },
    { name: 'd3', location: './d3' },
    { name: 'd3.v5', location: './d3.v5' },
    { name: 'phyloview', location: './phyloview' },
    { name: 'cytoscape-panzoom', location:'./cytoscape-panzoom' },
    { name: 'cytoscape-context-menus', location:'./cytoscape-context-menus' },
    { name: 'cytoscape-cola', location:'./cytoscape-cola' },
    { name: 'cytoscape-dagre', location:'./cytoscape-dagre' },
    { name: 'heatmap', location:'./heatmap' },
    { name: 'msa', location: './msa/dist', main: 'msa.min' }
  ],
  layers: {
    'p3/layer/core': {
      include: [
        'p3/app/p3app',
        'p3/panels',
        'dijit/layout/BorderContainer',
        'put-selector/put',
        'dijit/_base',
        'dijit/InlineEditBox',
        'dijit/form/ComboButton',
        'dijit/form/RadioButton',
        'dijit/CheckedMenuItem',
        'dojo/dnd/AutoSource',
        'p3/widget/TooltipDialog',
        'dijit/PopupMenuItem',
        'dijit/MenuSeparator',
        'p3/widget/GlobalSearch',
        'p3/widget/WorkspaceManager',
        'p3/widget/SelectionToGroup',
        'dojo/fx/Toggler',
        'p3/widget/JobStatus',
        'dojo/data/util/simpleFetch',
        'p3/widget/HierarchicalTrackList',
        'dijit/Toolbar',
        'dijit/ToolbarSeparator',
	'dijit/loading',
	'dijit/form/validate',
        'jDataView'
      ],
      exclude: ["rql/js-array"]
    },
    'p3/layer/viewers': {
      include: [
	'dojox/gfx/svg',
	'dojox/gfx/path',
        'p3/widget/ProteinFeatureSummary',
        'p3/widget/app/Annotation',
        'p3/widget/viewer/Taxonomy',
        'p3/widget/viewer/Genome',
        'p3/widget/viewer/GenomeList',
        'p3/widget/viewer/Feature',
        'p3/widget/viewer/FeatureList',
      ]
    },
    'p3/layer/jbrowse': {
      include: [
        'JBrowse/ConfigAdaptor/conf',
        'JBrowse/ConfigAdaptor/JB_json_v1',
        'JBrowse/Plugin',
        'JBrowse/Store/TrackMetaData',
        'JBrowse/View/TrackList/Hierarchical',
        'JBrowse/View/TrackList/_TextFilterMixin',
        'JBrowse/Store/SeqFeature/REST',
        'JBrowse/Store/SeqFeature',
        'JBrowse/Store',
        'JBrowse/Model/SimpleFeature',
        'JBrowse/View/Track/HTMLFeatures',
        'JBrowse/View/Ruler',
        'JBrowse/View/FASTA'
      ]
    },
    'p3/layer/outbreaks': {
      include: [
	'p3/widget/outbreaks/Mpox/index',
	'dojox/xml/DomParser',
	'p3/widget/outbreaks/OutbreaksOverview',
	'p3/widget/outbreaks/OutbreaksTab',
	'p3/widget/outbreaks/OutbreaksTabContainer',
	'p3/widget/outbreaks/OutbreaksPhylogenyTreeViewer',
	'p3/widget/outbreaks/OutbreaksGeoMap',
	'dojox/dtl/_Templated',
	'dojox/dtl/_base',
	'dojox/string/tokenize',
	'dojox/string/Builder',
	'p3/widget/outbreaks/OutbreaksGeoMapInfo'
      ]
    },
    'p3/layer/panels': {
      include: [
        'p3/widget/CreateFolder',
        'p3/widget/CreateWorkspace',
        'p3/widget/Uploader'
      ],
      exclude: [
        'p3/layer/core',
	'rql/js-array'
      ]
    },
    'p3/layer/p3user': {
      include: [
        'dojo/parser',
        'dijit/form/Form',
        'dijit/form/TextBox',
        'dijit/form/Button',
        'dojox/validate/web',
        'dijit/form/DropDownButton',
        'dijit/_base/manager',
        'dijit/_base',
        'dijit/WidgetSet',
        'dijit/selection',
        'dijit/form/ComboButton',
        'dijit/form/ToggleButton'
      ],
      exclude: ['rql/js-array']
    },
    'p3/layer/globalWSObject': {
      customBase: true,
      boot: true,
      include: [
        'p3/GlobalWorkspace'
      ],
      exclude: ['rql/js-array'],
      deps: [
        'p3/GlobalWorkspace'
      ]
    }
  }
};

