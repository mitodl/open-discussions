import { when } from "jest-when"
import type { AxiosResponse } from "axios"

type Method = "get" | "post" | "patch" | "delete"

type PartialAxiosResponse = Pick<AxiosResponse, "data" | "status">

const alwaysError = (
  method: string,
  url: string
): Promise<PartialAxiosResponse> => {
  const msg = `No response specified for ${method} ${url}`
  console.error(msg)
  throw new Error(msg)
}
const mockMakeRequest = jest.fn(alwaysError)

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
  when(mockMakeRequest).calledWith(method, url).mockResolvedValue({
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

const resetApi = () => {
  mockMakeRequest.mockImplementation(alwaysError)
}

export { setMockResponse, mockAxiosInstance, resetApi }
