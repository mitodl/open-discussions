var webpack = require('webpack');
var path = require("path");
var R = require('ramda');
var BundleTracker = require('webpack-bundle-tracker');
const { config, babelSharedLoader } = require(path.resolve("./webpack.config.shared.js"));

const hotEntry = (host, port) => (
  `webpack-hot-middleware/client?path=http://${host}:${port}/__webpack_hmr&timeout=20000&reload=true`
);

const insertHotReload = (host, port, entries) => (
  R.map(R.compose(R.flatten, v => [v].concat(hotEntry(host, port))), entries)
);

const devConfig = Object.assign({}, config, {
  context: __dirname,
  output: {
    path: path.resolve('./static/bundles/'),
    filename: "[name].js"
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': '"development"'
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2,
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new BundleTracker({filename: './webpack-stats.json'})
  ],
  devtool: 'source-map'
});

devConfig.module.rules = [
  babelSharedLoader,
  ...config.module.rules,
  {
    test: /\.css$|\.scss$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'postcss-loader' },
      { loader: 'sass-loader' },
    ]
  },
];

const makeDevConfig = (host, port) => (
  Object.assign({}, devConfig, {
    entry: insertHotReload(host, port, devConfig.entry),
  })
);

module.exports = makeDevConfig;
