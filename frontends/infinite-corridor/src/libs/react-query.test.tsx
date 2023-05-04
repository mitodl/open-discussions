import React from "react"
import { renderHook } from "@testing-library/react-hooks/dom"
import { allowConsoleErrors } from "ol-util/src/test-utils"
import { QueryClientProvider } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { createQueryClient } from "./react-query"

const queryClient = createQueryClient()
const wrapper = ({ children }) => (
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
    const { result, waitFor } = renderHook(
      () =>
        useQuery("test", {
          queryFn,
          retryDelay: 0
        }),
      { wrapper }
    )

    await waitFor(() => result.current.isError)
    expect(queryFn).toHaveBeenCalledTimes(retries + 1)
  }
)
