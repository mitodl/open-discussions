export type NetworkHeaders = Record<string, string>

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface NetworkResponse<T=unknown> {
  status: number
  body: T
}

export interface NetworkInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeRequest: <T = unknown>(method: Method, url: string, body?: any, headers?: NetworkHeaders) => Promise<NetworkResponse<T>>
  get: <T = unknown>(url: string, headers?: NetworkHeaders) => Promise<NetworkResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = unknown>(url: string, body?: any, headers?: NetworkHeaders) => Promise<NetworkResponse<T>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = unknown>(url: string, body?: any, headers?: NetworkHeaders) => Promise<NetworkResponse<T>>
  delete: <T = unknown>(url: string,  headers?: NetworkHeaders) => Promise<NetworkResponse<T>>
}

class NetworkError extends Error {

  status: number

  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

const makeRequest: NetworkInterface["makeRequest"] = async (method, url, body, headers) => {
  const response = await fetch(url, { headers, method, body})
  let errMsg: string
  try {
    const responseBody = await response.json()
    if (response.ok) {
      return { status: response.status, body: responseBody }
    }
    errMsg = responseBody?.detail ?? 'Network Error'
  } catch (err) {
    console.error(err)
    errMsg = "Network Error"
  }
  throw new NetworkError(response.status, errMsg)
}

const networkInterface: NetworkInterface = {
  makeRequest,
  get: (url, headers) => makeRequest('GET', url, undefined, headers),
  delete: (url, headers) => makeRequest('DELETE', url, undefined, headers),
  patch: (url, body, headers) => makeRequest('PATCH', url, body, headers),
  post: (url, body, headers) => makeRequest('POST', url, body, headers)
}

export default networkInterface