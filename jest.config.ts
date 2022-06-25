import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  collectCoverage:        true,
  coverageDirectory:      "coverage",
  projects:               ["<rootDir>/frontends/*/src"],
  setupFilesAfterEnv:     ['<rootDir>/jest-setup.js'],
  testEnvironment:        "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/frontends\\/open-discussions/", "<rootDir>/frontends/*/build"],
  transform:              {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  verbose: true,
}

export default config
