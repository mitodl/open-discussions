import { resolve } from "path"
import type { Config } from "@jest/types"

const config: Config.InitialOptions & Pick<Required<Config.InitialOptions>, "setupFilesAfterEnv"> = {
  setupFilesAfterEnv: [resolve(__dirname, './jest-shared-setup.ts')],
  testEnvironment:    "jsdom",
  transform:          {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  verbose: true,
  rootDir: "./src",
}

export default config
