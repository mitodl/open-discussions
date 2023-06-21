import type { Config } from '@jest/types'

/**
 * This configuration is used by root `yarn test` command to aggregate testing
 * across local packages.
 *
 * This is NOT the base configuration used by individual packages.
 */
const projectsConfig: Config.InitialOptions = {
  collectCoverage:   true,
  coverageDirectory: "coverage",
  projects:          ["<rootDir>/frontends/*/"],
  watchPlugins:      [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname"
  ]
}

export default projectsConfig
