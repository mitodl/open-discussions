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

// This should be the only top-level hook.
// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(() => {
  /**
   * Clear all mock call counts between tests.
   * This does NOT clear mock implementations.
   * Mock implementations are always cleared between test files.
   */
  jest.clearAllMocks()
  resetApi()
})
