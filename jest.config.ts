import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  collectCoverage:   true,
  coverageDirectory: "coverage",
  projects:          ["<rootDir>/frontends/*/"],
  watchPlugins:      [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname"
  ]
}

export default config
