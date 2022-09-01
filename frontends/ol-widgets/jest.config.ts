import type { Config } from '@jest/types'
import baseConfig from "../../jest.jsdom.config"

const config: Config.InitialOptions = {
  ...baseConfig,
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    "./setupJest.ts",
  ],
  rootDir: "./src",
}

export default config
