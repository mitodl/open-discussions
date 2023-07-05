import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { allowConsoleErrors } from "ol-util/test-utils"
import { QueryClientProvider } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { createMemoryHistory, MemoryHistory } from "history"
import { createQueryClient } from "./react-query"
import { Router } from "react-router"
import { withFakeLocation } from "../test-utils/withLocation"

const getWrapper = (history: MemoryHistory) => {
  const queryClient = createQueryClient(history)
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <Router history={history}>{children}</Router>
    </QueryClientProvider>
  )
  return wrapper
}

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
    const wrapper = getWrapper(createMemoryHistory())
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
  }
)

test.each([
  {
    startingLocation: "/",
    destination:      "/login/?next=/"
  },
  {
    startingLocation: "/place/to/go/",
    destination:      "/login/?next=/place/to/go/"
  }
])(
  "Should redirect window to $destination if user is not logged in",
  async ({ startingLocation, destination }) => {
    allowConsoleErrors()
    window.SETTINGS.user.is_authenticated = false
    const history = createMemoryHistory({ initialEntries: [startingLocation] })
    const wrapper = getWrapper(history)
    const queryFn = jest.fn().mockRejectedValue({ response: { status: 403 } })

    await withFakeLocation(async () => {
      const { result } = renderHook(() => useQuery(["test"], { queryFn }), {
        wrapper
      })
      await waitFor(() => {
        expect(window.location.href).toBe(destination)
      })
      expect(result.current.isError).toBe(true)
    })
  }
)

test.each([
  {
    status:           200,
    startingLocation: "/",
    state:            undefined
  },
  {
    status:           403,
    startingLocation: "/place/to/go",
    state:            { notFound: true }
  }
])(
  "Should maintain $startingLocation but set history.location.state.forbidden to true if user is logged in & gets 403",
  async ({ status, startingLocation, state }) => {
    allowConsoleErrors()
    window.SETTINGS.user.is_authenticated = true
    const history = createMemoryHistory()
    history.replace(startingLocation)
    const wrapper = getWrapper(history)
    const queryFn = jest
      .fn()
      .mockRejectedValue({ response: { status: status } })

    const { result } = renderHook(() => useQuery(["test"], { queryFn }), {
      wrapper
    })
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(history.location.pathname).toBe(startingLocation)
    expect.objectContaining({ state: state })
  }
)

test.each([
  {
    status:           200,
    startingLocation: "/",
    notFound:         false
  },
  {
    status:           404,
    startingLocation: "/does/not/exist/",
    notFound:         true
  }
])(
  "Should maintain $startingLocation but set history.location.state.notFound to true if user gets a 404",
  async ({ status, startingLocation, notFound }) => {
    allowConsoleErrors()
    const history = createMemoryHistory()
    history.replace(startingLocation)
    const wrapper = getWrapper(history)
    const queryFn = jest
      .fn()
      .mockRejectedValue({ response: { status: status } })

    const { result } = renderHook(() => useQuery(["test"], { queryFn }), {
      wrapper
    })
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(history.location.pathname).toBe(startingLocation)
    if (notFound) {
      expect(history.location).toEqual(
        expect.objectContaining({ state: { notFound: true } })
      )
    } else {
      expect(history.location).toEqual(
        expect.not.objectContaining({ state: { notFound: true } })
      )
    }
  }
)
