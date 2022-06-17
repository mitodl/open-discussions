const webpack = require("webpack")
const path = require("path")
const BundleTracker = require("webpack-bundle-tracker")
const { config } = require("./webpack.config.shared.js")
const { name } = require('./package.json')

const prodConfig = Object.assign({}, config)

module.exports = Object.assign(prodConfig, {
  context: __dirname,
  mode:    "production",
  output:  {
    path:               path.resolve(__dirname, `../../static/bundles/${name}`),
    filename:           "[name]-[chunkhash].js",
    chunkFilename:      "[id]-[chunkhash].js",
    crossOriginLoading: "anonymous",
    publicPath:         "./"
  },

  plugins: [
    new BundleTracker({
      filename: "./webpack-stats.json"
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    }),
    new webpack.optimize.AggressiveMergingPlugin(),
  ],
  optimization: {
    minimize: true
  },
  devtool: "source-map"
})
