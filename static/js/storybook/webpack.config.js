const { devConfig } = require("../../../webpack.config.dev")

module.exports = baseConfig => {
  baseConfig.module.rules = devConfig.module.rules

  return baseConfig
}
