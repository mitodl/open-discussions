import React from "react"
import { renderHook } from "@testing-library/react-hooks/dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { faker } from "@faker-js/faker"
import { setMockResponse, act } from "../../test-utils"
import { invalidateResourceQueries } from "./util"
import { urls } from "./urls"
import { clone } from "lodash"
import { useInfiniteSearch } from "./search"
import { useFavorite, useUnfavorite } from "./favorites"
import { makeCourse, makeSearchResponse } from "ol-search-ui/src/factories"

jest.mock("./util", () => {
  const actual = jest.requireActual("./util")
  return {
    ...actual,
    invalidateResourceQueries: jest.fn(actual.invalidateResourceQueries)
  }
})

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

  const spies = {
    queryClient: {
      invalidateQueries: jest.spyOn(queryClient, "invalidateQueries")
    },
    invalidateResourceQueries: jest.mocked(invalidateResourceQueries)
  }

  return { wrapper, spies, queryClient }
}

describe.each([
  {
    wasFavorite: false,
    useHook:     useFavorite,
    favUrl:      urls.resource.favorite
  },
  {
    wasFavorite: true,
    useHook:     useUnfavorite,
    favUrl:      urls.resource.unfavorite
  }
])("$useHook.name", ({ useHook, favUrl, wasFavorite }) => {
  it("Invalidates resource queries", async () => {
    const { wrapper } = setup()
    const resource = makeCourse()

    const { result } = renderHook(useHook, { wrapper })

    setMockResponse.post(favUrl(resource.object_type, resource.id), resource)
    await act(async () => {
      await result.current.mutateAsync(resource)
    })

    expect(invalidateResourceQueries).toHaveBeenCalledWith(
      expect.anything(),
      resource
    )
  })

  it("patches search results queries", async () => {
    const { wrapper } = setup()
    const searchResults = makeSearchResponse(4, 10)
    const i = faker.datatype.number({ min: 0, max: 3 })
    const resource = searchResults.hits.hits[i]._source
    resource.is_favorite = wasFavorite

    const expected = clone(searchResults)
    expected.hits.hits[i]._source = {
      ...resource,
      is_favorite: !wasFavorite
    }

    const useTestHook = () => {
      const mutation = useHook()
      const search = useInfiniteSearch({})
      return { mutation, search }
    }
    setMockResponse.post(urls.search, searchResults)
    const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([searchResults])
    })

    setMockResponse.post(favUrl(resource.object_type, resource.id), resource)
    await result.current.mutation.mutateAsync(
      // @ts-expect-error searchResource is not a LearningResource but it is close enough
      resource
    )

    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([expected])
    })
  })
})
