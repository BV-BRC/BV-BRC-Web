const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  entry: {
    // Core bundle: external libs + bvbrcClient + copilot (replaces bundle.js)
    core: './public/js/webpack-entries/core-libs.js',

    // Viewer-specific libraries (fixes missing molstar, mauve, heatmap)
    viewers: './public/js/webpack-entries/viewers-libs.js',

    // Archaeopteryx bundle (replaces bundle2.js)
    archaeopteryx: './public/js/webpack-entries/archaeopteryx-libs.js'
  },

  output: {
    path: path.resolve(__dirname, 'public/js/dist'),
    filename: '[name].bundle.js'
    // Remove library config to allow UMD modules to self-register globally
  },

  optimization: {
    // Disable code splitting to keep bundles consolidated
    splitChunks: false,
    // Enable minification in production
    minimize: process.env.NODE_ENV === 'production'
  },

  resolve: {
    alias: {
      // Map to existing library locations
      'cytoscape': path.resolve(__dirname, 'public/js/cytoscape/dist/cytoscape.min.js'),
      'jquery': path.resolve(__dirname, 'public/js/jquery/dist/jquery.min.js'),
      'dagre': path.resolve(__dirname, 'public/js/dagre/dist/dagre.min.js'),
      'webcola': path.resolve(__dirname, 'public/js/webcola/WebCola/cola.min.js'),
      // Use node_modules versions for better tree-shaking
      'markdown-it': path.resolve(__dirname, 'node_modules/markdown-it/dist/markdown-it.min.js'),
      'html2canvas': path.resolve(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js')
    },
    extensions: ['.js', '.json'],
    fallback: {
      // Return empty objects for Node.js core modules that aren't needed
      // This prevents errors when UMD modules try to require() them
      "stream": require.resolve('stream-browserify'),
      "buffer": false,
      "util": false
    }
  },

  // Disable Node.js-specific globals while keeping JavaScript built-ins
  node: {
    __dirname: false,
    __filename: false,
    global: false
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      },
      // Disable webpack's module wrapping for archaeopteryx UMD files
      // This allows them to self-register on window object
      {
        test: /archaeopteryx[\\/].*\.js$/,
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
