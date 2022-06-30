import { resolve } from "path"
import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
  setupFilesAfterEnv: [resolve(__dirname, './jest-jsdom-setup.ts')],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  verbose: true,
}

export default config
