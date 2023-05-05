import React from "react"
import { renderHook } from "@testing-library/react-hooks/dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useInfiniteLimitOffsetQuery } from "./util"
import { setMockResponse, act } from "../../test-utils"
import axios from "../../libs/axios"

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { wrapper }
}

describe("useInfiniteLimitOffsetQuery", () => {
  it("Makes paginated requests using response's `next`, until `next` is null", async () => {
    const { wrapper } = setup()
    const initialUrl = "/some-list"
    const nextUrl = "/some-list?offset=3"
    const firstPage = {
      next:    nextUrl,
      results: ["a", "b", "c"]
    }
    const secondPage = {
      next:    null,
      results: ["d", "e", "f"]
    }
    setMockResponse.get(initialUrl, firstPage)
    setMockResponse.get(nextUrl, secondPage)
    const { result, waitFor } = renderHook(
      () =>
        useInfiniteLimitOffsetQuery(initialUrl, { queryKey: ["some-list"] }),
      { wrapper }
    )

    await waitFor(() => result.current.isSuccess)

    expect(result.current.data?.pages).toEqual([firstPage])
    expect(axios.get).toHaveBeenCalledWith(initialUrl)
    expect(axios.get).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    setMockResponse.get(initialUrl, secondPage)
    expect(result.current.data?.pages).toEqual([firstPage, secondPage])
    expect(axios.get).toHaveBeenCalledWith(nextUrl)
    expect(axios.get).toHaveBeenCalledTimes(2)

    jest.mocked(axios.get).mockClear()
    await act(async () => {
      await result.current.fetchNextPage()
    })
    expect(axios.get).not.toHaveBeenCalled()
  })
})
