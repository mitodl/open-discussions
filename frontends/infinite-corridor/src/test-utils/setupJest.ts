import { mockAxiosInstance } from "./mockAxios"

jest.mock("axios", () => {
  return {
    __esModule: true,
    default: {
      create: () => mockAxiosInstance,
    },
  }
})

afterEach(() => {
  jest.resetAllMocks()
})
