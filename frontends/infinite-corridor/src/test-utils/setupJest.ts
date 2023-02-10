import "jest-extended"
import "jest-extended/all"

import { setupMockMarkdownEditor } from "ol-widgets/src/test-utils"
import { createMatchMediaForJsDom } from "ol-util/src/test-utils"
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
  resetApi()
  global.SETTINGS = _createSettings()
})

const DEFAULT_DEVICE_WIDTH = "1200px"
beforeAll(() => {
  window.matchMedia = createMatchMediaForJsDom({ width: DEFAULT_DEVICE_WIDTH })
})

/**
 * We frequently spy on these, so let's just do it once.
 */
jest.mock("ol-search-ui", () => {
  const actual = jest.requireActual("ol-search-ui")
  return {
    ...actual,
    LearningResourceCard:            jest.fn(actual.LearningResourceCard),
    ExpandedLearningResourceDisplay: jest.fn(
      actual.ExpandedLearningResourceDisplay
    )
  }
})
