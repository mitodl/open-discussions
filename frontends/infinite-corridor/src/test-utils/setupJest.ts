import { makeRequest } from "./mockNetworkInterface"

jest.mock("ol-network-interface", () => {
  const { makeNetworkInterface } = jest.requireActual("ol-network-interface")

  return {
    __esModule: true,
    default: makeNetworkInterface(makeRequest),
  }
})

afterEach(() => {
  jest.resetAllMocks()
})
