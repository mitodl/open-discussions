import "jest-extended"
import "jest-extended/all"

import { mockAxiosInstance, resetApi } from "./mockAxios"

jest.mock("axios", () => {
  return {
    __esModule: true,
    default:    {
      create: () => mockAxiosInstance
    }
  }
})

const _createSettings = () => ({
  embedlyKey:        "fake",
  ocw_next_base_url: "fake-ocw.com",
  search_page_size:  4
})

global.SETTINGS = _createSettings()

// This should be the only top-level hook.
// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(() => {
  global.SETTINGS = _createSettings()
  jest.resetAllMocks()
  resetApi()
})
