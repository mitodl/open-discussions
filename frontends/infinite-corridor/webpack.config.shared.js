module.exports = {
  config: {
    entry: {
      root: "./src/entry/root",
    },
    module: {
      rules: [
        {
          // this regex is necessary to explicitly exclude ckeditor stuff
          test: /static\/.+\.(svg|ttf|woff|woff2|eot|gif)$/,
          use:  "url-loader"
        },
        {
          test:    /\.tsx?$/,
          use:     "swc-loader",
          exclude: /node_modules/
        },
      ]
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"]
    },
    performance: {
      hints: false
    }
  }
}
