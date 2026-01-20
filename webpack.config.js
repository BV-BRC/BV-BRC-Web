const path = require('path');
const DojoWebpackPlugin = require('dojo-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  entry: {
    // Core application - loaded immediately with shared runtime
    core: {
      import: 'p3/layer/core',
      runtime: 'runtime'
    },

    // Shared graph/grid helpers (webcola, shared containers) reused by grids + graph-viz
    'graph-shared': {
      import: 'p3/layer/graph-shared',
      dependOn: 'core'
    },

    // Lazy-loaded layers - depend on core to avoid duplication
    // They'll be loaded on demand via script tags
    viewers: {
      import: 'p3/layer/viewers',
      dependOn: ['core', 'graph-viz']
    },
    jbrowse: {
      import: 'p3/layer/jbrowse',
      dependOn: 'core'
    },
    outbreaks: {
      import: 'p3/layer/outbreaks',
      dependOn: ['core', 'archaeopteryx', 'jbrowse']
    },
    search: {
      import: 'p3/layer/search',
      dependOn: 'core'
    },
    apps: {
      import: 'p3/layer/apps',
      dependOn: ['core', 'workspace']
    },
    grids: {
      import: 'p3/layer/grids',
      dependOn: ['core', 'graph-shared']
    },
    'graph-viz': {
      import: 'p3/layer/graph-viz',
      dependOn: ['core', 'graph-shared']
    },
    phylogeny: {
      import: 'p3/layer/phylogeny',
      dependOn: 'core'
    },
    workspace: {
      import: 'p3/layer/workspace',
      dependOn: 'core'
    },

    // Viewer-specific layers - each bundles its specific viewer widget(s)
    // These import directly from the widget files to bundle each viewer separately
    // They depend on viewers.bundle.js to avoid duplication
    'viewer-taxonomy': {
      import: 'p3/widget/viewer/Taxonomy',
      dependOn: ['viewers', 'grids', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-genome': {
      import: 'p3/widget/viewer/Genome',
      dependOn: ['viewers', 'grids', 'jbrowse', 'graph-viz', 'phylogeny']
    },
    'viewer-feature': {
      import: 'p3/widget/viewer/Feature',
      dependOn: ['viewers', 'grids', 'jbrowse']
    },
    'viewer-genome-list': {
      import: 'p3/widget/viewer/GenomeList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-feature-list': {
      import: 'p3/widget/viewer/FeatureList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-genome-group': {
      import: 'p3/widget/viewer/GenomeGroup',
      dependOn: ['viewers', 'grids']
    },
    'viewer-feature-group': {
      import: 'p3/widget/viewer/FeatureGroup',
      dependOn: ['viewers', 'grids']
    },
    'viewer-protein': {
      import: 'p3/widget/viewer/Protein',
      dependOn: ['viewers', 'grids', 'jbrowse']
    },
    'viewer-antibiotic': {
      import: 'p3/widget/viewer/Antibiotic',
      dependOn: ['viewers', 'grids']
    },
    'viewer-antibiotic-list': {
      import: 'p3/widget/viewer/AntibioticList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-bacteria': {
      import: 'p3/widget/viewer/Bacteria',
      dependOn: ['viewers', 'grids', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-virus': {
      import: 'p3/widget/viewer/Virus',
      dependOn: ['viewers', 'grids', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-host': {
      import: 'p3/widget/viewer/Host',
      dependOn: ['viewers', 'grids']
    },
    'viewer-bioset-result': {
      import: 'p3/widget/viewer/BiosetResult',
      dependOn: ['viewers', 'grids']
    },
    'viewer-blast': {
      import: 'p3/widget/viewer/Blast',
      dependOn: ['viewers', 'grids']
    },
    'viewer-blast-job-result': {
      import: 'p3/widget/viewer/BlastJobResult',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-comprehensive-genome-analysis': {
      import: 'p3/widget/viewer/ComprehensiveGenomeAnalysis',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-comprehensive-sars2-analysis': {
      import: 'p3/widget/viewer/ComprehensiveSARS2Analysis',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-copilot': {
      import: 'p3/widget/viewer/Copilot',
      dependOn: ['viewers', 'grids']
    },
    'viewer-data-type': {
      import: 'p3/widget/viewer/DataType',
      dependOn: ['viewers', 'graph-viz']
    },
    'viewer-differential-expression': {
      import: 'p3/widget/viewer/DifferentialExpression',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-domains-and-motifs-list': {
      import: 'p3/widget/viewer/DomainsAndMotifsList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-epitope': {
      import: 'p3/widget/viewer/Epitope',
      dependOn: ['viewers', 'grids']
    },
    'viewer-epitope-list': {
      import: 'p3/widget/viewer/EpitopeList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-experiment': {
      import: 'p3/widget/viewer/Experiment',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-experiment-comparison': {
      import: 'p3/widget/viewer/ExperimentComparison',
      dependOn: ['viewers', 'grids']
    },
    'viewer-experiment-group': {
      import: 'p3/widget/viewer/ExperimentGroup',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-experiment-list': {
      import: 'p3/widget/viewer/ExperimentList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-fasta': {
      import: 'p3/widget/viewer/FASTA',
      dependOn: 'viewers'
    },
    'viewer-file': {
      import: 'p3/widget/viewer/File',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-genome-alignment': {
      import: 'p3/widget/viewer/GenomeAlignment',
      dependOn: ['viewers', 'workspace', 'graph-viz']
    },
    'viewer-genome-annotation': {
      import: 'p3/widget/viewer/GenomeAnnotation',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-genome-comparison': {
      import: 'p3/widget/viewer/GenomeComparison',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-genome-distance': {
      import: 'p3/widget/viewer/GenomeDistance',
      dependOn: ['viewers', 'grids']
    },
    'viewer-ha-subtype-numbering-report': {
      import: 'p3/widget/viewer/HASubtypeNumberingReport',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-homology': {
      import: 'p3/widget/viewer/Homology',
      dependOn: ['viewers', 'grids']
    },
    'viewer-id-mapping': {
      import: 'p3/widget/viewer/IDMapping',
      dependOn: ['viewers', 'grids']
    },
    'viewer-id-mapping-app': {
      import: 'p3/widget/viewer/IDMappingApp',
      dependOn: ['viewers', 'grids']
    },
    'viewer-job-result': {
      import: 'p3/widget/viewer/JobResult',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-model': {
      import: 'p3/widget/viewer/Model',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-msa': {
      import: 'p3/widget/viewer/MSA',
      dependOn: ['viewers', 'graph-viz']
    },
    'viewer-msa-tree': {
      import: 'p3/widget/viewer/MSATree',
      dependOn: ['viewers', 'workspace', 'graph-viz', 'archaeopteryx']
    },
    'viewer-msa-view': {
      import: 'p3/widget/viewer/MSAView',
      dependOn: ['viewers', 'workspace', 'graph-viz', 'archaeopteryx']
    },
    'viewer-pathway-list': {
      import: 'p3/widget/viewer/PathwayList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-pathway-map': {
      import: 'p3/widget/viewer/PathwayMap',
      dependOn: ['viewers', 'grids']
    },
    'viewer-pathway-service': {
      import: 'p3/widget/viewer/PathwayService',
      dependOn: ['viewers', 'workspace', 'grids']
    },
    'viewer-pathway-summary': {
      import: 'p3/widget/viewer/PathwaySummary',
      dependOn: ['viewers', 'grids']
    },
    'viewer-phylogenetic-tree': {
      import: 'p3/widget/viewer/PhylogeneticTree',
      dependOn: ['viewers', 'workspace', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-phylogenetic-tree2': {
      import: 'p3/widget/viewer/PhylogeneticTree2',
      dependOn: ['viewers', 'workspace', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-phylogenetic-tree-gene': {
      import: 'p3/widget/viewer/PhylogeneticTreeGene',
      dependOn: ['viewers', 'workspace', 'graph-viz', 'archaeopteryx', 'phylogeny']
    },
    'viewer-protein-families-service': {
      import: 'p3/widget/viewer/ProteinFamiliesService',
      dependOn: ['viewers', 'workspace', 'grids']
    },
    'viewer-protein-list': {
      import: 'p3/widget/viewer/ProteinList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-protein-structure': {
      import: 'p3/widget/viewer/ProteinStructure',
      dependOn: 'viewers'
    },
    'viewer-protein-structure-list': {
      import: 'p3/widget/viewer/ProteinStructureList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-sars2-assembly': {
      import: 'p3/widget/viewer/SARS2Assembly',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-seq': {
      import: 'p3/widget/viewer/Seq',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-seq-comparison': {
      import: 'p3/widget/viewer/SeqComparison',
      dependOn: ['viewers', 'workspace']
    },
    'viewer-sequence': {
      import: 'p3/widget/viewer/Sequence',
      dependOn: ['viewers', 'grids']
    },
    'viewer-sequence-list': {
      import: 'p3/widget/viewer/SequenceList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-serology': {
      import: 'p3/widget/viewer/Serology',
      dependOn: 'viewers'
    },
    'viewer-serology-list': {
      import: 'p3/widget/viewer/SerologyList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-sfvt': {
      import: 'p3/widget/viewer/SFVT',
      dependOn: ['viewers', 'grids']
    },
    'viewer-specialty-gene': {
      import: 'p3/widget/viewer/SpecialtyGene',
      dependOn: ['viewers', 'grids']
    },
    'viewer-specialty-gene-evidence': {
      import: 'p3/widget/viewer/SpecialtyGeneEvidence',
      dependOn: ['viewers', 'grids']
    },
    'viewer-specialty-gene-list': {
      import: 'p3/widget/viewer/SpecialtyGeneList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-specialty-vf-gene-list': {
      import: 'p3/widget/viewer/SpecialtyVFGeneList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-strain-list': {
      import: 'p3/widget/viewer/StrainList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-structure': {
      import: 'p3/widget/viewer/Structure',
      dependOn: 'viewers'
    },
    'viewer-subsystem-list': {
      import: 'p3/widget/viewer/SubsystemList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-subsystem-map': {
      import: 'p3/widget/viewer/SubSystemMap',
      dependOn: ['viewers', 'grids']
    },
    'viewer-subsystem-service': {
      import: 'p3/widget/viewer/SubsystemService',
      dependOn: ['viewers', 'workspace', 'grids']
    },
    'viewer-subsystem-service-map': {
      import: 'p3/widget/viewer/SubsystemServiceMap',
      dependOn: ['viewers', 'grids']
    },
    'viewer-surveillance': {
      import: 'p3/widget/viewer/Surveillance',
      dependOn: 'viewers'
    },
    'viewer-surveillance-data-map': {
      import: 'p3/widget/viewer/SurveillanceDataMap',
      dependOn: ['viewers', 'grids']
    },
    'viewer-surveillance-list': {
      import: 'p3/widget/viewer/SurveillanceList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-system-status': {
      import: 'p3/widget/viewer/SystemStatus',
      dependOn: 'viewers'
    },
    'viewer-taxon-list': {
      import: 'p3/widget/viewer/TaxonList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-transcriptomics-experiment': {
      import: 'p3/widget/viewer/TranscriptomicsExperiment',
      dependOn: ['viewers', 'grids']
    },
    'viewer-tsv-csv': {
      import: 'p3/widget/viewer/TSV_CSV',
      dependOn: ['viewers', 'workspace', 'grids']
    },
    'viewer-ws-feature-list': {
      import: 'p3/widget/viewer/WSFeatureList',
      dependOn: ['viewers', 'grids']
    },
    'viewer-ws-genome-group': {
      import: 'p3/widget/viewer/WSGenomeGroup',
      dependOn: ['viewers', 'grids']
    },
    // Default viewers use the base viewers bundle, no separate entry needed

    // Archaeopteryx libraries - separate entry to avoid bundling in core
    archaeopteryx: {
      import: './public/js/webpack-entries/archaeopteryx-libs.js',
      dependOn: 'core'
    },

    // External libs bundle (non-AMD modules) - no runtime dependency
    libs: './public/js/webpack-entries/core-libs.js',

    // CSS aggregate bundle to reduce individual stylesheet requests
    styles: './public/js/webpack-entries/styles.js'
  },

  output: {
    path: path.resolve(__dirname, 'public/js/release'),
    filename: '[name].bundle.js',
    publicPath: '/js/release/',
    pathinfo: false
  },

  externals: {
    // Google Maps API loaded via script tag in HTML head, accessed as global
    'google-maps': 'google.maps',
    'https://maps.googleapis.com/maps/api/js?key=AIzaSyAo6Eq83tcpiWufvVpw_uuqdoRfWbFXfQ8&sensor=false&libraries=drawing': 'google.maps',
    // Molstar loaded externally via script tag, accessed as BVBRCMolStarWrapper global
    'molstar/mol-bvbrc/index': 'BVBRCMolStarWrapper'
  },

  plugins: [
    // Dojo webpack plugin to handle AMD modules
    new DojoWebpackPlugin({
      loaderConfig: require('./loaderConfig'),
      environment: { dojoRoot: 'public/js' },
      buildEnvironment: { dojoRoot: 'public/js' },
      locales: ['en'],
      noConsole: false,
      ignoreNonModuleResources: true  // Let webpack resolve non-module resources
    }),

    // Handle external module replacements
    new webpack.NormalModuleReplacementPlugin(
      /^heatmap\/dist\/hotmap$/,
      path.resolve(__dirname, 'public/js/heatmap/dist/hotmap.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^markdown-it\/dist\/markdown-it\.min$/,
      path.resolve(__dirname, 'node_modules/markdown-it/dist/markdown-it.min.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^html2canvas\/dist\/html2canvas\.min$/,
      path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^molstar\/mol-bvbrc\/index$/,
      path.resolve(__dirname, 'public/js/molstar/mol-bvbrc/index.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^mauve_viewer\/dist\/mauve-viewer$/,
      path.resolve(__dirname, 'public/js/mauve_viewer/dist/mauve-viewer.js')
    ),

    // Replace dojo/domReady plugin references
    new webpack.NormalModuleReplacementPlugin(
      /^dojo\/domReady!?$/,
      path.resolve(__dirname, 'public/js/dojo/domReady.js')
    ),

    // Handle xstyle/css! loader plugin syntax
    new webpack.NormalModuleReplacementPlugin(
      /^xstyle\/css!/,
      function(data) {
        // xstyle/css! loader - extract the CSS file path
        var match = /^xstyle\/css!(.*)$/.exec(data.request);
        if (match) {
          // Use webpack's CSS loaders to handle the CSS file
          data.request = match[1];
        }
      }
    ),

    // Extract CSS into a standalone bundle instead of injecting via style tags
    new MiniCssExtractPlugin({
      filename: '[name].bundle.css'
    }),

    // Ignore viewer layer files - they're loaded as plain scripts and use embedded Dojo loader
    new webpack.IgnorePlugin({
      resourceRegExp: /^p3\/layer\/viewer\//
    }),


    // Ignore firebug - not needed
    new webpack.IgnorePlugin({
      resourceRegExp: /\/_firebug\/firebug$/
    }),

    // Ignore dojo/domReady in JBrowse - it's handled by embedded Dojo loader
    new webpack.IgnorePlugin({
      resourceRegExp: /^dojo\/domReady$/,
      contextRegExp: /jbrowse/
    }),

    // Replace dojox/gfx/renderer! with svg renderer
    new webpack.NormalModuleReplacementPlugin(
      /dojox\/gfx\/renderer!?$/,
      path.resolve(__dirname, 'public/js/dojox/gfx/svg.js')
    )
  ],

  optimization: {
    runtimeChunk: {
      name: 'runtime'  // Separate runtime bundle shared by all entry points
    },
    // Disable chunk splitting; rely on explicit layer entries and dependOn relationships
    splitChunks: false,
    minimize: process.env.NODE_ENV === 'production'
  },

  resolve: {
    extensions: ['.js', '.json'],
    modules: [
      path.resolve(__dirname, 'public/js'),  // Search public/js first
      'node_modules'  // Then node_modules
    ],
    alias: {
      // Map AMD CSS plugin to the loader
      'xstyle/build/amd-css': path.resolve(__dirname, 'public/js/xstyle/build/amd-css.js'),
      'xstyle/css': path.resolve(__dirname, 'public/js/xstyle/css.js'),
      // Dojo plugin modules that use dynamic resolution
      'dojo/domReady': path.resolve(__dirname, 'public/js/dojo/domReady.js'),
      'dojox/gfx/renderer': path.resolve(__dirname, 'public/js/dojox/gfx/svg.js')
    },
    fallback: {
      "stream": require.resolve('stream-browserify'),
      "buffer": false,
      "util": false,
      "path": false,
      "fs": false
    }
  },

  module: {
    rules: [
      {
        // Let dojo-webpack-plugin handle dojo/text! loader
        test: /\.txt$/,
        use: 'raw-loader'
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              // Leave absolute /patric asset URLs untouched; they are served from the existing static path.
              url: {
                filter: (url) => !url.startsWith('/patric/')
              }
            }
          }
        ]
      },
      {
        // JBrowse Browser uses dynamic require context; skip context parsing to avoid analysis errors
        test: /node_modules[\\/]jbrowse[\\/]src[\\/]JBrowse[\\/]Browser\.js$/,
        parser: {
          requireContext: false
        }
      },
      {
        // GenomeBrowser dynamically loads plugins; disable context analysis so the AMD require config passes through
        test: /public[\\/]js[\\/]p3[\\/]widget[\\/]GenomeBrowser\.js$/,
        parser: {
          requireContext: false
        }
      },
      {
        // Disable webpack's built-in JSON parsing for files in resources folders
        // that are loaded via dojo/text! - let the text loader handle them
        test: /[\\/]resources[\\/].*\.json$/,
        type: 'javascript/auto'
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      },
      {
        // Handle archaeopteryx UMD modules
        test: /archaeopteryx[\\/].*\.js$/,
        use: ['script-loader']
      },
      {
        // Fix rql modules - they use indirect define pattern that webpack doesn't support
        // Force them to use CommonJS mode by setting define to undefined
        test: /[\\/]rql[\\/].*\.js$/,
        use: [
          {
            loader: 'imports-loader',
            options: {
              wrapper: {
                thisArg: 'window',
                args: {
                  define: 'undefined'
                }
              }
            }
          }
        ]
      },
      {
        // lazyload.js expects to run with 'this' as window and needs access to document
        test: /[\\/]lazyload[\\/]lazyload\.js$/,
        use: ['script-loader']
      }
    ]
  },

  // Generate source maps for debugging
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',

  // Performance hints
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  },

  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }
};
