import type { Config } from "@jest/types"
import baseConfig from "../../jest.jsdom.config"

const _createSettings = () => ({
  embedlyKey:        "fake",
  ocw_next_base_url: "fake-ocw.com",
  search_page_size:  4
})

const config: Config.InitialOptions = {
  ...baseConfig,
  globals: {
    SETTINGS: _createSettings()
  }
}

export default config
