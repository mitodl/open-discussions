import React from "react"
import { renderHook } from "@testing-library/react-hooks/dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { invalidateResourceQueries, useInfiniteLimitOffsetQuery } from "./util"
import { setMockResponse, act } from "../../test-utils"
import axios from "../../libs/axios"
import {
  makeLearningResource,
  makeLearningResourcesPaginated,
  makeListItemsPaginated
} from "ol-search-ui/src/factories"
import { urls } from "./urls"
import {
  useNewVideos,
  usePopularContent,
  useResource,
  useUpcomingCourses
} from "./resources"
import { faker } from "@faker-js/faker"
import { useFavoritesListing } from "./favorites"
import { useStaffListItems } from "./resourceLists"

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

  return { wrapper, queryClient }
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
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    setMockResponse.get(initialUrl, secondPage)
    await waitFor(() => {
      expect(result.current.data?.pages).toEqual([firstPage, secondPage])
    })
    expect(axios.get).toHaveBeenCalledWith(nextUrl)
    expect(axios.get).toHaveBeenCalledTimes(2)

    expect(result.current.hasNextPage).toBe(false)
  })
})

describe("invalidateResourceQueries", () => {
  it("invalidates `useResource` if and only if resource matches", async () => {
    const resource1 = makeLearningResource()
    const resource2 = makeLearningResource()
    const modified1 = { ...resource1, title: "changed" }
    const modified2 = { ...resource1, title: "changed" }
    const url1 = urls.resource.details(resource1.object_type, resource1.id)
    const url2 = urls.resource.details(resource2.object_type, resource2.id)
    const { wrapper, queryClient } = setup()

    setMockResponse.get(url1, resource1)
    setMockResponse.get(url2, resource2)
    const { result, waitFor } = renderHook(
      () => {
        return {
          r1: useResource(resource1.object_type, resource1.id),
          r2: useResource(resource2.object_type, resource2.id)
        }
      },
      { wrapper }
    )

    await waitFor(() => result.current.r1.isSuccess)
    await waitFor(() => result.current.r2.isSuccess)

    setMockResponse.get(url1, modified1)
    setMockResponse.get(url2, modified2)
    invalidateResourceQueries(queryClient, resource1)

    // r1 re-fetched
    await waitFor(() => {
      expect(result.current.r1.data).toEqual(modified1)
    })
    // r2 did not
    expect(result.current.r2.data).toEqual(resource2)
  })

  it.each([
    { hook: useUpcomingCourses, url: urls.course.upcoming() },
    { hook: usePopularContent, url: urls.popularContent.listing() },
    { hook: useNewVideos, url: urls.video.new() },
    { hook: useFavoritesListing, url: urls.favorite.listing() }
  ])(
    "Invalidates $hook.name if listing includes resource",
    async ({ hook, url }) => {
      const resources = makeLearningResourcesPaginated({ count: 3 })
      setMockResponse.get(url, resources)
      const resource = faker.helpers.arrayElement(resources.results)

      const { wrapper, queryClient } = setup()
      const { result, waitFor } = renderHook(() => hook(), { wrapper })

      await waitFor(() => result.current.isSuccess)
      expect(result.current.data).toEqual(resources)

      const changed = makeLearningResourcesPaginated({ count: 3 })
      setMockResponse.get(url, changed)
      invalidateResourceQueries(queryClient, resource)
      await waitFor(() => {
        expect(result.current.data).toEqual(changed)
      })
    }
  )

  it.each([
    { hook: useUpcomingCourses, url: urls.course.upcoming() },
    { hook: usePopularContent, url: urls.popularContent.listing() },
    { hook: useNewVideos, url: urls.video.new() },
    { hook: useFavoritesListing, url: urls.favorite.listing() }
  ])(
    "does NOT invalidates $hook.name if listing does NOT includes resource",
    async ({ hook, url }) => {
      const resources = makeLearningResourcesPaginated({ count: 3 })
      setMockResponse.get(url, resources)

      const { wrapper, queryClient } = setup()
      const { result, waitFor } = renderHook(() => hook(), { wrapper })

      await waitFor(() => result.current.isSuccess)
      expect(result.current.data).toEqual(resources)
      expect(axios.get).toHaveBeenCalledTimes(1)
      jest.mocked(axios.get).mockClear()

      invalidateResourceQueries(queryClient, makeLearningResource())
      // If a refetch were going to happen, it would be async, so wait a moment.
      await new Promise(res => setTimeout(res, 50))
      expect(axios.get).not.toHaveBeenCalled()
    }
  )

  it.each([
    {
      hook: useStaffListItems,
      url:  urls.staffList.itemsListing
    },
    {
      hook: useStaffListItems,
      url:  urls.staffList.itemsListing
    }
  ])(
    "Invalidates $hook.name if listing includes resource",
    async ({ hook, url }) => {
      const items = makeListItemsPaginated({ count: 3 })
      const listId = faker.datatype.number()
      setMockResponse.get(url(listId), items)

      const resource = faker.helpers.arrayElement(items.results).content_data

      const { wrapper, queryClient } = setup()
      const { result, waitFor } = renderHook(() => hook(listId), { wrapper })

      await waitFor(() => result.current.isSuccess)

      const changed = makeListItemsPaginated({ count: 3 })
      setMockResponse.get(url(listId), changed)
      invalidateResourceQueries(queryClient, resource)

      await waitFor(() => {
        expect(result.current.data).toEqual(
          expect.objectContaining({
            pages: [changed]
          })
        )
      })
    }
  )

  it.each([
    {
      hook: useStaffListItems,
      url:  urls.staffList.itemsListing
    },
    {
      hook: useStaffListItems,
      url:  urls.staffList.itemsListing
    }
  ])(
    "does NOT Invalidate $hook.name if listing does NOT include resource",
    async ({ hook, url }) => {
      const items = makeListItemsPaginated({ count: 3 })
      const listId = faker.datatype.number()
      setMockResponse.get(url(listId), items)

      const { wrapper, queryClient } = setup()
      const { result, waitFor } = renderHook(() => hook(listId), { wrapper })

      await waitFor(() => result.current.isSuccess)

      expect(axios.get).toHaveBeenCalledTimes(1)
      jest.mocked(axios.get).mockClear()

      const changed = makeListItemsPaginated({ count: 3 })
      setMockResponse.get(url(listId), changed)
      invalidateResourceQueries(queryClient, makeLearningResource())

      // If a refetch were going to happen, it would be async, so wait a moment.
      await new Promise(res => setTimeout(res, 50))
      expect(axios.get).not.toHaveBeenCalled()
    }
  )
})
