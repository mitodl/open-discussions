const path = require("path")
const webpack = require("webpack")
const BundleTracker = require("webpack-bundle-tracker")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")

const STATS_FILEPATH = path.resolve(__dirname, "../../webpack-stats/open-discussions.json")

const getPublicPath = isProduction => {
  const { OPEN_DISCUSSIONS_HOSTNAME: hostname, WEBPACK_PORT_OPEN_DISCUSSIONS: port } = process.env
  const buildPath = "/static/open-discussions/"
  if (isProduction) return buildPath
  if (!hostname || !port) {
    throw new Error(`hostname (${hostname}) and port (${port}) should both be defined.`)
  }
  return `http://${hostname}:${port}/`
}


const getWebpackConfig = mode => {
  console.log(`Building for ${mode}`)
  const isProduction = mode === "production"
  const publicPath = getPublicPath(isProduction)
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
          test:   /\.jsx?$/,
          loader: "babel-loader",
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
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      new webpack.DefinePlugin({
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }),
    ].concat(isProduction ? [
      new webpack.LoaderOptionsPlugin({ minimize: true }),
      new webpack.optimize.AggressiveMergingPlugin(),
      new MiniCssExtractPlugin({ filename: "[name]-[contenthash].css" })
    ] : []),
    resolve: {
      extensions: [".js", ".jsx"],
      fallback:   {
        assert: require.resolve("assert"),
        os:     require.resolve("os-browserify"),
        path:   require.resolve("path-browserify"),
        url:    require.resolve("url")
      }
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
      client: {
        overlay: {
          errors:   true,
          warnings: false,
        },
      },
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
