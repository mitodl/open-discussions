/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path")
const webpack = require("webpack")
const BundleTracker = require("webpack-bundle-tracker")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CKEditorWebpackPlugin = require('@ckeditor/ckeditor5-dev-webpack-plugin')
const { styles } = require('@ckeditor/ckeditor5-dev-utils')

const STATS_FILEPATH = path.resolve(__dirname, "../../webpack-stats/infinite-corridor.json")

const getPublicPath = isProduction => {
  const { OPEN_DISCUSSIONS_HOSTNAME: hostname, WEBPACK_PORT_INFINITE_CORRIDOR: port } = process.env
  const buildPath = "/static/infinite-corridor/"
  if (isProduction) return buildPath
  if (!hostname || !port) {
    throw new Error(`hostname (${hostname}) and port (${port}) should both be defined.`)
  }
  return `http://${hostname}:${port}/`
}

/**
 * CKEditor (which we are including via ol-widgets) distributes its npm packages
 * as pre-bundled, ready-to-use modules, or as un-built modules for greater
 * customization. This takes care of building CKEditor. See for more:
 * https://ckeditor.com/docs/ckeditor5/latest/installation/advanced/alternative-setups/integrating-from-source.html
 */
const ckeditorRules = [
  {
    test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
    use:  ["raw-loader"]
  },
  {
    test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
    use:  [
      {
        loader:  "style-loader",
        options: {
          injectType: "singletonStyleTag",
          attributes: {
            "data-cke": true
          }
        }
      },
      'css-loader',
      {
        loader:  "postcss-loader",
        options: {
          postcssOptions: styles.getPostCssConfig({
            themeImporter: {
              themePath: require.resolve(
                "@ckeditor/ckeditor5-theme-lark"
              )
            },
            minify: true
          })
        }
      }
    ]
  }
]


const getWebpackConfig = mode => {
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
          test:    /\.(svg|ttf|woff|woff2|eot|gif|png)$/,
          exclude: /@ckeditor/,
          type:    "asset/inline"
        },
        {
          test:    /\.tsx?$/,
          use:     "swc-loader",
          exclude: /node_modules/
        },
        ...ckeditorRules,
        {
          test:    /\.css$|\.scss$/,
          exclude: /@ckeditor/,
          use:     [
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
      new webpack.DefinePlugin({
        "process.env": {
          env: { NODE_ENV: JSON.stringify(mode) },
        }
      }),
    ].concat(isProduction ? [
      new webpack.LoaderOptionsPlugin({ minimize: true }),
      new webpack.optimize.AggressiveMergingPlugin(),
      new MiniCssExtractPlugin({ filename: "[name]-[contenthash].css" }),
      new CKEditorWebpackPlugin({
        language:                               "en",
        addMainLanguageTranslationsToAllAssets: true
      })
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
