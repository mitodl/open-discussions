const path = require("path")
const webpack = require("webpack")

module.exports = {
  config: {
    entry: {
      root:  ["core-js/stable", "regenerator-runtime/runtime", "./static/js/entry/root"],
      style: "./static/js/entry/style"
    },
    module: {
      rules: [
        {
          test: /\.(svg|ttf|woff|woff2|eot|gif|png)$/,
          use:  "url-loader"
        }
      ]
    },
    resolve: {
      modules:    [path.join(__dirname, "static/js"), "node_modules"],
      extensions: [".js", ".jsx"]
    },
    performance: {
      hints: false
    }
  },
  babelSharedLoader: {
    test:    /\.jsx?$/,
    exclude: /node_modules/,
    loader:  "babel-loader",
    query:   {
      presets: [
        ["@babel/preset-env", { modules: false }],
        "@babel/preset-react",
        "@babel/preset-flow"
      ],
      ignore:  ["node_modules/**"],
      plugins: [
        "react-hot-loader/babel",
        "@babel/plugin-proposal-class-properties",
      ]
    }
  }
}
