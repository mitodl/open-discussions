import { when } from "jest-when"
import type { AxiosResponse } from "axios"

type Method = "get" | "post" | "patch" | "delete"

type PartialAxiosResponse = Pick<AxiosResponse, "data" | "status">

const mockMakeRequest = jest.fn(
  (method: string, url: string): Promise<PartialAxiosResponse> => {
    const msg = `No response specified for ${method} ${url}`
    console.error(msg)
    throw new Error(msg)
  }
)

const mockAxiosInstance = {
  get:    (url: string) => mockMakeRequest("get", url),
  post:   (url: string) => mockMakeRequest("post", url),
  patch:  (url: string) => mockMakeRequest("patch", url),
  delete: (url: string) => mockMakeRequest("delete", url)
}

const mockRequest = (
  method: Method,
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
      data:   responseBody,
      status: code
    })
}

const setMockResponse = {
  get: (url: string, responseBody: unknown, code = 200) =>
    mockRequest("get", url, responseBody, code),
  post: (url: string, responseBody: unknown, code = 201) =>
    mockRequest("post", url, responseBody, code),
  patch: (url: string, responseBody: unknown, code = 200) =>
    mockRequest("patch", url, responseBody, code),
  delete: (url: string, responseBody: unknown, code = 204) =>
    mockRequest("delete", url, responseBody, code)
}

export { setMockResponse, mockAxiosInstance }
