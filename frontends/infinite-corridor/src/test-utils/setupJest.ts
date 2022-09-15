/* eslint-disable mocha/no-top-level-hooks */
import "jest-extended"
import "jest-extended/all"

import { setupMockMarkdownEditor } from "ol-widgets/build/test-utils"
import { createMatchMediaForJsDom } from "ol-util/build/test-utils"
import { mockAxiosInstance, resetApi } from "./mockAxios"

setupMockMarkdownEditor()

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

afterEach(() => {
  /**
   * Clear all mock call counts between tests.
   * This does NOT clear mock implementations.
   * Mock implementations are always cleared between test files.
   */
  jest.clearAllMocks()
  global.SETTINGS = _createSettings()
  resetApi()
})

const DEFAULT_DEVICE_WIDTH = "1200px"
beforeAll(() => {
  window.matchMedia = createMatchMediaForJsDom({ width: DEFAULT_DEVICE_WIDTH })
})
