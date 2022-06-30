import type { Config } from '@jest/types'
import baseConfig from "../../jest.jsdom.config"

const config: Config.InitialOptions = {
  ...baseConfig,
  rootDir: "./src",
}

export default config