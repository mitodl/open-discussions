module.exports = api => {
  const isProduction = api.env("production")
  const isTest = api.env("test")
  return {
    ignore:  [/node_modules/],
    presets: isTest ? [
      "@babel/env",
      "@babel/preset-react"
    ] : [
      ["@babel/preset-env", { modules: false }],
      "@babel/preset-react",
      "@babel/preset-flow"
    ],
    plugins: [
      "@babel/plugin-transform-flow-strip-types",
      ...(isProduction ? [] : ["react-hot-loader/babel"]),
      "@babel/plugin-transform-object-rest-spread",
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-syntax-dynamic-import",
    ].concat(isProduction ? [
      "@babel/plugin-transform-react-constant-elements",
      "@babel/plugin-transform-react-inline-elements"
    ] : [])
  }
}
