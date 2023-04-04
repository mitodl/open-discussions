import { when } from "jest-when"
import type { AxiosResponse } from "axios"

type Method = "get" | "post" | "patch" | "delete"

type PartialAxiosResponse = Pick<AxiosResponse, "data" | "status">

const alwaysError = (
  method: string,
  url: string,
  _body?: unknown
): Promise<PartialAxiosResponse> => {
  const msg = `No response specified for ${method} ${url}`
  console.error(msg)
  throw new Error(msg)
}

/**
 * A jest mock function that makes fake network requests.
 *
 * Spy on it to check its calls. For example, to assert that it has been called
 * with a specific value:
 * ```ts
 * expect(makeRequest).toHaveBeenCalledWith([
 *  'post',
 *  '/some/url/to/thing',
 *   expect.objectContaining({ some: 'value' }) // request body
 * ])
 * ```
 */
const makeRequest = jest.fn(alwaysError)

const mockAxiosInstance = {
  get:   jest.fn((url: string) => makeRequest("get", url, undefined)),
  post:  jest.fn((url: string, body: unknown) => makeRequest("post", url, body)),
  patch: jest.fn((url: string, body: unknown) =>
    makeRequest("patch", url, body)
  ),
  delete: jest.fn((url: string) => makeRequest("delete", url, undefined))
}

const expectAnyOrNil = expect.toBeOneOf([expect.anything(), undefined, null])

const mockRequest = (
  method: Method,
  url: string,
  requestBody = expectAnyOrNil,
  responseBody: unknown = undefined,
  code: number
) => {
  if (code >= 400) {
    when(makeRequest)
      .calledWith(method, url, requestBody)
      .mockRejectedValue({
        response: {
          data:   responseBody,
          status: code
        }
      })
  } else {
    when(makeRequest).calledWith(method, url, requestBody).mockResolvedValue({
      data:   responseBody,
      status: code
    })
  }
}

interface MockResponseOptions {
  /**
   * Only match requests with this request body.
   * By default, matches anything, including null and undefined.
   *
   * @notes
   * accepts Jest matches, e.g., `expect.objectContaining({ some: 'prop' })`
   */
  requestBody?: unknown
  code?: number
}

const setMockResponse = {
  get: (
    url: string,
    responseBody: unknown,
    { code = 200, requestBody }: MockResponseOptions = {}
  ) => mockRequest("get", url, requestBody, responseBody, code),
  post: (
    url: string,
    responseBody?: unknown,
    { code = 201, requestBody }: MockResponseOptions = {}
  ) => mockRequest("post", url, requestBody, responseBody, code),
  patch: (
    url: string,
    responseBody?: unknown,
    { code = 200, requestBody }: MockResponseOptions = {}
  ) => mockRequest("patch", url, requestBody, responseBody, code),
  delete: (
    url: string,
    responseBody?: unknown,
    { code = 204, requestBody }: MockResponseOptions = {}
  ) => mockRequest("delete", url, requestBody, responseBody, code),
  /**
   * Set a custom fallback implementation when no responses have been specified.
   *
   * If no custom fallback is specified, unmocked responses will result in an
   * error.
   */
  defaultImplementation: when(makeRequest).defaultImplementation
}

const resetApi = () => {
  makeRequest.mockReset()
  makeRequest.mockImplementation(alwaysError)
}

export { setMockResponse, mockAxiosInstance, makeRequest, resetApi }
