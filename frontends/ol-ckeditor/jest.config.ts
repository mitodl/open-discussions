import type { Config } from "@jest/types"
import baseConfig from "../../jest.jsdom.config"

const config: Config.InitialOptions = {
  ...baseConfig,
  setupFilesAfterEnv:      [...baseConfig.setupFilesAfterEnv, "./setupJest.ts"],
  transformIgnorePatterns: [
    "/node_modules/(?!(" +
      "@ckeditor/*" +
      "|ckeditor5/*" +
      "|lodash-es" +
      "|vanilla-colorful" +
      ")/)"
  ]
}

export default config
