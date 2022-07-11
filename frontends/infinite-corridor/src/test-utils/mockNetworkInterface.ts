import { when } from "jest-when"
import type { NetworkInterface } from "ol-network-interface"

const mockMakeRequest = jest.fn<
  ReturnType<NetworkInterface["makeRequest"]>,
  Parameters<NetworkInterface["makeRequest"]>
>((...args) => {
  const [method, url] = args
  const msg = `No response specified for ${method} ${url}`
  console.error(msg)
  throw new Error(msg)
})

const mockRequest = (
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  responseBody: unknown,
  code: number
) => {
  when(mockMakeRequest)
    .calledWith(
      when.allArgs((allArgs, equals) => {
        /**
         * Skip matching on headers / request body.
         */
        return equals(allArgs[0], method) && equals(allArgs[1], url)
      })
    )
    .mockResolvedValue({
      body: responseBody,
      status: code,
    })
}

const setMockResponse = {
  get: (url: string, responseBody: unknown, code = 200) =>
    mockRequest("GET", url, responseBody, code),
  post: (url: string, responseBody: unknown, code = 201) =>
    mockRequest("POST", url, responseBody, code),
  patch: (url: string, responseBody: unknown, code = 200) =>
    mockRequest("PATCH", url, responseBody, code),
  delete: (url: string, responseBody: unknown, code = 204) =>
    mockRequest("DELETE", url, responseBody, code),
}

const makeRequest = mockMakeRequest as NetworkInterface["makeRequest"]

export { setMockResponse, makeRequest }
