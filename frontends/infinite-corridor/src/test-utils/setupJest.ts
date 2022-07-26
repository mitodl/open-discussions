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
  jest.resetAllMocks()
  resetApi()
})
