import type { Config } from '@jest/types'
import baseConfig from "../../jest.jsdom.config"

const config: Config.InitialOptions = {
  ...baseConfig,
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    "./test-utils/setupJest.ts",
    "./test-utils/testing_init.ts",

  ],
  rootDir: "./src",
}

export default config