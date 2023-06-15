import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { allowConsoleErrors } from "ol-util/src/test-utils"
import { QueryClientProvider } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { createBrowserHistory } from "history"
import { createQueryClient } from "./react-query"

const browserHistory = createBrowserHistory()
const queryClient = createQueryClient(browserHistory)
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

test.each([
  { status: 408, retries: 3 },
  { status: 429, retries: 3 },
  { status: 502, retries: 3 },
  { status: 503, retries: 3 },
  { status: 504, retries: 3 },
  // No retries
  { status: 403, retries: 0 }
])(
  "should retry $status failures $retries times",
  async ({ status, retries }) => {
    allowConsoleErrors()
    const queryFn = jest.fn().mockRejectedValue({ response: { status } })
    const { result } = renderHook(
      () =>
        useQuery(["test"], {
          queryFn,
          retryDelay: 0
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(queryFn).toHaveBeenCalledTimes(retries + 1)
  })

test.each([
  {userIsAuthenticated: true, startingLocation: "", destination: "/forbidden"},
  {userIsAuthenticated: true, startingLocation: "/place/to/go", destination: "/forbidden"},
  {userIsAuthenticated: false, startingLocation: "", destination: ""},
  {userIsAuthenticated: false, startingLocation: "/place/to/go", destination: "/place/to/go/"},
])(
  "Should redirect to $destination if user.is_authenticated is $userIsAuthenticated",
  async ({userIsAuthenticated, startingLocation,  destination}) => {
    window.SETTINGS.user.is_authenticated = userIsAuthenticated
    const queryFn = jest.fn().mockRejectedValue({response: 403})
    const baseUrl = "http://test.com"
    delete (window as any).location
    window.location.href = baseUrl
    window.location.pathname = startingLocation

    const { result } = renderHook(
      () =>
        useQuery(["test"], {queryFn}),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(window.location.href).toBe(baseUrl)
    expect(window.location.pathname).toBe(destination)
  })
