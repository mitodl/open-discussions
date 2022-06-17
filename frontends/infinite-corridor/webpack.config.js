const path = require("path")
const webpack = require("webpack")
const BundleTracker = require("webpack-bundle-tracker")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const STATS_FILEPATH = path.resolve(__dirname, "../../webpack-stats/infinite-corridor.json")

const getWebpackConfig = mode => {
  const isProduction = mode === "production"
  const publicPath = process.env.PUBLIC_PATH || "/static/mitx-online/"
  return {
    mode,
    context: __dirname,
    devtool: "source-map",
    entry:   {
      root:         "./src/entry/root",
      style:        "./src/entry/style",
    },
    output:  {
      path: path.resolve(__dirname, "build"),
      ...(isProduction ? {
        filename:           "[name]-[chunkhash].js",
        chunkFilename:      "[id]-[chunkhash].js",
        crossOriginLoading: "anonymous",
        hashFunction:       "xxhash64"
      } : {
        filename: "[name].js",
      }),
      publicPath
    },
    module: {
      rules: [
        {
          test: /\.(svg|ttf|woff|woff2|eot|gif|png)$/,
          type: "asset/inline"
        },
        {
          test:    /\.tsx?$/,
          use:     "swc-loader",
          exclude: /node_modules/
        },
        {
          test: /\.css$|\.scss$/,
          use:  [
            { loader: isProduction ? MiniCssExtractPlugin.loader : "style-loader" },
            "css-loader",
            "postcss-loader",
            "sass-loader"
          ]
        }
      ]
    },
    plugins: [
      new BundleTracker({ filename: STATS_FILEPATH }),
    ].concat(isProduction ? [
      new webpack.LoaderOptionsPlugin({ minimize: true }),
      new webpack.optimize.AggressiveMergingPlugin(),
      new MiniCssExtractPlugin({ filename: "[name]-[contenthash].css" })
    ] : []),
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"]
    },
    performance: {
      hints: false
    },
    optimization: {
      moduleIds:   "named",
      splitChunks:  {
        name:      "common",
        minChunks: 2,
        ...(isProduction ? {
          cacheGroups: {
            common: {
              test:   /[\\/]node_modules[\\/]/,
              name:   'common',
              chunks: 'all',
            }
          }
        } : {})
      },
      minimize:     isProduction,
      emitOnErrors: false
    },
    devServer: {
      allowedHosts: "all",
      headers:      {
        'Access-Control-Allow-Origin': '*'
      },
      host: "::",
    }
  }
}

module.exports = (_env, argv) => {
  const mode = argv.mode || process.env.NODE_ENV || "production"
  return getWebpackConfig(mode)
}
