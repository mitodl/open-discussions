import "jest-extended"
import "jest-extended/all"

import { setupMockEditors } from "ol-ckeditor/test_utils"
import { createMatchMediaForJsDom } from "ol-util/src/test-utils"
import { mockAxiosInstance, resetApi } from "./mockAxios"
import { makeUserSettings } from "./factories"

setupMockEditors()

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
  search_page_size:  4,
  user:              makeUserSettings()
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
    LearningResourceCardTemplate:    jest.fn(actual.LearningResourceCardTemplate),
    ExpandedLearningResourceDisplay: jest.fn(
      actual.ExpandedLearningResourceDisplay
    )
  }
})
jest.mock("../components/LearningResourceCard", () => {
  const actual = jest.requireActual("../components/LearningResourceCard")
  return {
    __esModule: true,
    ...actual,
    default:    jest.fn(actual.default)
  }
})
