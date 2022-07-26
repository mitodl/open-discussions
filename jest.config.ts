import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  collectCoverage:   true,
  coverageDirectory: "coverage",
  projects:          ["<rootDir>/frontends/*/"],
}

export default config
