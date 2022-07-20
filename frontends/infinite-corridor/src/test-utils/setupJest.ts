/** There should be no top-level hooks other than this file. */
/* eslint-disable mocha/no-top-level-hooks */
import { mockAxiosInstance } from "./mockAxios"

jest.mock("axios", () => {
  return {
    __esModule: true,
    default:    {
      create: () => mockAxiosInstance
    }
  }
})

afterEach(() => {
  jest.resetAllMocks()
})
