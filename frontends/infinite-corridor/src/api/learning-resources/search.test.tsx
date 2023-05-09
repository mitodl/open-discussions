import React from "react"
import {
  SearchQueryParams,
  buildSearchQuery
} from "@mitodl/course-search-utils"
import { act } from "@testing-library/react"
import { renderHook } from "@testing-library/react-hooks/dom"
import * as factories from "ol-search-ui/src/factories"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { setMockResponse } from "../../test-utils/mockAxios"
import { urls } from "./urls"
import axios from "../../libs/axios"
import { useInfiniteSearch } from "./search"

import { assertNotNil } from "ol-util"

const setSearchResponse = (pageSize: number, total: number) => {
  setMockResponse.post(
    urls.search,
    factories.makeSearchResponse(pageSize, total)
  )
}

const assertSearchLastCalledWith = (
  params: SearchQueryParams,
  exactly = false
) => {
  const body = exactly ? params : expect.objectContaining(params)
  expect(axios.post).toHaveBeenLastCalledWith(urls.search, body)
}

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

describe("useInfiniteSearch", () => {
  it("Returns pages of results until none are left", async () => {
    setSearchResponse(3, 7)
    const { wrapper } = setup()
    const { result, waitFor } = renderHook(
      () =>
        useInfiniteSearch({
          size: 3
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    assertNotNil(result.current.data)
    expect(result.current.data.pages.length).toBe(1)
    expect(result.current.data.pages[0].hits.hits.length).toBe(3)
    assertSearchLastCalledWith({ from: 0, size: 3 })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.data?.pages.length).toBe(2)
    })
    assertSearchLastCalledWith({ from: 3, size: 3 })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(result.current.hasNextPage).toBe(true)
    await waitFor(() => {
      expect(result.current.data?.pages.length).toBe(3)
    })
    assertSearchLastCalledWith({ from: 6, size: 3 })

    // No more pages left!
    expect(result.current.hasNextPage).toBe(false)
  })

  it("uses correct searchparams when making calls", () => {
    setSearchResponse(3, 7)
    const { wrapper } = setup()
    renderHook(
      () =>
        useInfiniteSearch({
          size:         3,
          text:         "foo",
          activeFacets: {
            type: ["course"]
          }
        }),
      { wrapper }
    )
    expect(axios.post).toHaveBeenCalledWith(
      urls.search,
      buildSearchQuery({
        text:         "foo",
        size:         3,
        from:         0,
        activeFacets: {
          type: ["course"]
        }
      })
    )
  })
})
