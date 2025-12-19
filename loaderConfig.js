// Dojo loader configuration for dojo-webpack-plugin
module.exports = {
  baseUrl: './public/js',
  blankGif: '/js/dojo/resources/blank.gif',
  paths: {
    'dojo': 'dojo',
    'dijit': 'dijit',
    'dojox': 'dojox',
    'xstyle': 'xstyle',
    'dgrid': 'dgrid'
  },
  packages: [
    { name: 'dojo', location: 'dojo' },
    { name: 'dijit', location: 'dijit' },
    { name: 'dojox', location: 'dojox' },
    { name: 'p3', location: 'p3' },
    { name: 'dgrid', location: 'dgrid' },
    { name: 'put-selector', location: 'put-selector' },
    { name: 'xstyle', location: 'xstyle' },
    { name: 'dbind', location: 'dbind' },
    { name: 'rql', location: 'rql' },
    { name: 'JBrowse', location: 'JBrowse' },
    { name: 'jszlib', location: 'jszlib' },
    { name: 'FileSaver', location: 'FileSaver', main: 'FileSaver' },
    { name: 'circulus', location: 'circulus' },
    { name: 'lazyload', location: 'lazyload', main: 'lazyload' },
    { name: 'jDataView', location: 'jDataView/src', main: 'jdataview' },
    { name: 'd3', location: 'd3' },
    { name: 'd3.v5', location: 'd3.v5' },
    { name: 'phyloview', location: 'phyloview' },
    { name: 'heatmap', location: 'heatmap' },
    { name: 'msa', location: 'msa/dist', main: 'msa.min' },
    { name: 'markdown-it', location: 'markdown-it/dist', main: 'markdown-it.min' },
    { name: 'html2canvas', location: 'html2canvas/dist', main: 'html2canvas.min' },
    { name: 'molstar', location: 'molstar/mol-bvbrc', main: 'index' },
    { name: 'mauve_viewer', location: 'mauve_viewer/dist', main: 'mauve-viewer' }
    // cytoscape, dagre, webcola now loaded from node_modules via webpack (see viewers.js layer)
  ],
  has: {
    'dojo-firebug': false,
    'dojo-debug-messages': true,
    'dojo-trace-api': false,
    'dojo-log-api': true,
    'async': true,
    'webpack': true
  },
  async: true
  // Plugin loaders handled by dojo-webpack-plugin
  // CSS files are processed by webpack's css-loader and style-loader
};
