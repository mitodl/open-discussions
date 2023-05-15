import React from "react"
import { clone } from "lodash"
import { renderHook } from "@testing-library/react-hooks/dom"
import { act } from "@testing-library/react"
import { faker } from "@faker-js/faker"
import { LearningResourceType as LRT, LearningResource } from "ol-search-ui"
import { allowConsoleErrors, ControlledPromise } from "ol-util/src/test-utils"
import * as factories from "ol-search-ui/src/factories"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  useAddToListItems,
  useCreateUserList,
  useDeleteFromListItems,
  useDeleteUserList,
  useResource,
  useFavorite,
  useUnfavorite,
  useUserListItems,
  useMoveListItem,
  useStaffListItems
} from "./hooks"
import { setMockResponse } from "../../test-utils/mockAxios"
import { urls, keys } from "./urls"
import { useInfiniteSearch } from "./search"
import axios from "../../libs/axios"
import { invalidateResourceQueries } from "./util"

jest.mock("./util", () => {
  const actual = jest.requireActual("./util")
  return {
    ...actual,
    invalidateResourceQueries: jest.fn(actual.invalidateResourceQueries)
  }
})

function* makeCounter() {
  let i = 0
  while (true) {
    yield i++
  }
}

const setup = () => {
  const idCounter = makeCounter()
  setMockResponse.defaultImplementation((method, url) => {
    return Promise.resolve({
      data:   `request number ${idCounter.next().value} (${method} to ${url})`,
      status: 200
    })
  })
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

test("useResource rejects with invalid resource type", async () => {
  const { wrapper } = setup()
  const { result, waitFor } = renderHook(() => useResource("fake_type", 123), {
    wrapper
  })

  allowConsoleErrors()
  await waitFor(() => result.current.isError)
  expect(result.current.error).toEqual(
    new Error("Unknown resource type: fake_type")
  )
})

test("useCreateUserList invalidates userlist Listings", async () => {
  const { wrapper, spies } = setup()

  const { result } = renderHook(() => useCreateUserList(), { wrapper })

  await act(() => result.current.mutateAsync({ title: "My new list" }))

  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.userList.listing.all
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
})

test("useDeleteUserList invalidates all resource queries", async () => {
  const { wrapper, spies } = setup()

  const { result } = renderHook(() => useDeleteUserList(), { wrapper })

  await act(() => result.current.mutateAsync(faker.datatype.number()))

  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.all
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
})

test.each([
  () => {
    const list = factories.makeUserList()
    const addItemUrl = urls.userList.itemAdd(list.id)
    const item = factories.makeListItemMember()
    const resource = factories.makeCourse()
    const resourceUrl = urls.resource.details(resource.object_type, resource.id)
    const resourcePatch = { lists: resource.lists.concat(item) }
    return { list, addItemUrl, resource, resourcePatch, resourceUrl }
  },
  () => {
    const list = factories.makeStaffList()
    const addItemUrl = urls.staffList.itemAdd(list.id)
    const item = factories.makeListItemMember()
    const resource = factories.makeCourse()
    const resourcePatch = { stafflists: resource.stafflists.concat(item) }
    const resourceUrl = urls.resource.details(resource.object_type, resource.id)
    return { list, addItemUrl, resource, resourcePatch, resourceUrl }
  }
])(
  "useAddToListItems invalidates list details and lists listing",
  async getData => {
    const { wrapper, spies } = setup()
    const { resource, list, addItemUrl, resourceUrl, resourcePatch } = getData()

    setMockResponse.get(
      urls.resource.details(resource.object_type, resource.id),
      resource
    )

    const modifiedAddedResource = { ...resource, ...resourcePatch }

    const { result: resourceResult } = renderHook(
      () => useResource(resource.object_type, resource.id),
      { wrapper }
    )
    const { result: addResult, waitFor } = renderHook(
      () => useAddToListItems(),
      { wrapper }
    )

    setMockResponse.post(addItemUrl, { content_data: modifiedAddedResource })
    setMockResponse.get(resourceUrl, new ControlledPromise())

    await act(async () => {
      await addResult.current.mutateAsync({
        list,
        item: {
          object_id:    resource.id,
          content_type: resource.object_type
        }
      })
    })

    expect(axios.post).toHaveBeenCalledWith(addItemUrl, expect.anything())

    expect(spies.invalidateResourceQueries).toHaveBeenCalledWith(
      expect.anything(),
      modifiedAddedResource
    )
    expect(spies.invalidateResourceQueries).toHaveBeenCalledWith(
      expect.anything(),
      list
    )

    // The POST response result updated resource data
    await waitFor(() => {
      expect(resourceResult.current.data).toEqual(modifiedAddedResource)
    })
  }
)

test("useAddToListItems patches search results", async () => {
  const { wrapper } = setup()
  const searchResults = factories.makeSearchResponse(4, 10)
  const i = faker.datatype.number({ min: 0, max: 3 })
  const searchResource = searchResults.hits.hits[i]._source
  const oldMember = factories.makeListItemMember()
  const newMember = factories.makeListItemMember()

  // just one item to begin with
  searchResource.lists = [oldMember]
  const expected = clone(searchResults)
  expected.hits.hits[i]._source = {
    ...searchResource,
    lists: [oldMember, newMember]
  }

  const useTestHook = () => {
    const addItem = useAddToListItems()
    const search = useInfiniteSearch({})
    return { addItem, search }
  }
  setMockResponse.post(urls.search, searchResults)
  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([searchResults])
  })

  setMockResponse.post(urls.userList.itemAdd(newMember.list_id), {
    content_data: factories.makeLearningResource({
      id:          searchResource.id,
      object_type: searchResource.object_type,
      lists:       [oldMember, newMember]
    })
  })
  await result.current.addItem.mutateAsync({
    list: { id: newMember.list_id, object_type: LRT.Userlist },
    item: newMember
  })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([expected])
  })
})

test("useDeleteFromListItems patches search results", async () => {
  const { wrapper } = setup()
  const searchResults = factories.makeSearchResponse(4, 10)
  const i = faker.datatype.number({ min: 0, max: 3 })
  const searchResource = searchResults.hits.hits[i]._source
  const deleteIndex = faker.datatype.number({ min: 0, max: 1 })
  const oldMembers = [
    factories.makeListItemMember(),
    factories.makeListItemMember()
  ]

  // just one item to begin with
  searchResource.lists = oldMembers
  const expected = clone(searchResults)
  expected.hits.hits[i]._source = {
    ...searchResource,
    lists: oldMembers.filter((_, index) => index !== deleteIndex)
  }

  const useTestHook = () => {
    const deleteItem = useDeleteFromListItems()
    const search = useInfiniteSearch({})
    return { deleteItem, search }
  }
  setMockResponse.post(urls.search, searchResults)
  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([searchResults])
  })

  await result.current.deleteItem.mutateAsync({
    list: { id: oldMembers[deleteIndex].list_id, object_type: LRT.Userlist },
    item: oldMembers[deleteIndex]
  })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([expected])
  })
})

test.each([
  {
    list: factories.makeUserList({ id: 123 }),
    item: factories.makeListItemMember({ item_id: 789 }),
    url:  urls.userList.itemDetails(123, 789)
  },
  {
    list: factories.makeStaffList({ id: 456 }),
    item: factories.makeListItemMember({ item_id: 789 }),
    url:  urls.staffList.itemDetails(456, 789)
  }
])(
  "useDeleteFromListItems makes API call and invalidates appropriate queries",
  async ({ list, url, item }) => {
    const { wrapper, spies } = setup()

    const resource = factories.makeLearningResource({
      id:          item.object_id,
      object_type: item.content_type,
      lists:       [item]
    })
    const resourceUrl = urls.resource.details(resource.object_type, resource.id)
    setMockResponse.get(resourceUrl, resource)

    const { result } = renderHook(() => useDeleteFromListItems(), { wrapper })

    await act(async () => result.current.mutateAsync({ list, item }))

    expect(axios.delete).toHaveBeenCalledWith(url)

    expect(spies.invalidateResourceQueries).toHaveBeenCalledWith(
      expect.anything(),
      { object_type: item.content_type, id: item.object_id }
    )
    expect(spies.invalidateResourceQueries).toHaveBeenCalledWith(
      expect.anything(),
      list
    )
  }
)

test("useDeleteFromListItems optimistically updates resource data", async () => {
  const { wrapper } = setup()

  const userlist = factories.makeUserList()
  const itemToDelete = factories.makeListItemMember({
    content_type: LRT.Course, // should match affectedResourceData
    list_id:      userlist.id
  })

  const resource = factories.makeCourse({
    id:    itemToDelete.object_id,
    lists: [itemToDelete]
  })
  const resourceUrl = urls.resource.details(resource.object_type, resource.id)
  setMockResponse.get(resourceUrl, resource)
  const modifiedResource = { ...resource, lists: [] }

  const { result: resourceQuery } = renderHook(
    () => useResource(resource.object_type, resource.id),
    { wrapper }
  )
  const { result, waitFor } = renderHook(() => useDeleteFromListItems(), {
    wrapper
  })

  await waitFor(() => resourceQuery.current.isFetched)

  act(() => {
    result.current.mutateAsync({
      list: userlist,
      item: itemToDelete
    })
  })

  const resourceResponse = new ControlledPromise<LearningResource>()
  setMockResponse.get(resourceUrl, resourceResponse)

  // Optimistic update
  await waitFor(() => {
    expect(resourceQuery.current.data).toEqual(modifiedResource)
  })
  expect(resourceQuery.current.isFetching).toBe(true)

  resourceResponse.resolve(modifiedResource)
  // Server update
  await waitFor(() => {
    expect(resourceQuery.current.isFetching).toBe(false)
  })
})

test("useFavorite invalidates appropriate queries", async () => {
  const { wrapper, spies } = setup()
  const resource = factories.makeCourse({ is_favorite: false })

  const { result } = renderHook(() => useFavorite(), { wrapper })

  await act(async () => {
    await result.current.mutateAsync(resource)
  })

  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.resource(resource.object_type).id(resource.id).details
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.favorites.all
  })
})

test("useUnfavorite invalidates appropriate queries", async () => {
  const { wrapper, spies } = setup()
  const resource = factories.makeCourse({ is_favorite: true })

  const { result } = renderHook(() => useUnfavorite(), { wrapper })

  await act(async () => {
    await result.current.mutateAsync(resource)
  })

  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.resource(resource.object_type).id(resource.id).details
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.favorites.all
  })
})

test.each([
  {
    hook:        useFavorite,
    wasFavorite: false
  },
  {
    hook:        useUnfavorite,
    wasFavorite: true
  }
])("$hook patches search results queries", async ({ hook, wasFavorite }) => {
  const { wrapper } = setup()
  const searchResults = factories.makeSearchResponse(4, 10)
  const i = faker.datatype.number({ min: 0, max: 3 })
  const searchResource = searchResults.hits.hits[i]._source
  searchResource.is_favorite = wasFavorite

  const expected = clone(searchResults)
  expected.hits.hits[i]._source = {
    ...searchResource,
    is_favorite: !wasFavorite
  }

  const useTestHook = () => {
    const mutation = hook()
    const search = useInfiniteSearch({})
    return { mutation, search }
  }
  setMockResponse.post(urls.search, searchResults)
  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([searchResults])
  })

  await result.current.mutation.mutateAsync(
    // @ts-expect-error searchResource is not a LearningResource but it is close enough
    searchResource
  )

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([expected])
  })
})

test.each([
  {
    mode:          "userlist",
    useItemsQuery: useUserListItems,
    itemsUrl:      "userlists/123/items"
  },
  {
    mode:          "stafflist",
    useItemsQuery: useStaffListItems,
    itemsUrl:      "stafflists/123/items"
  }
] as const)(
  "useMoveListItem($mode) invalidates appropriate queries",
  async ({ mode, useItemsQuery, itemsUrl }) => {
    const { wrapper, spies } = setup()
    const page1 = factories.makeListItemsPaginated(
      {
        count:    5,
        pageSize: 3
      },
      { next: `${itemsUrl}?limit=3&offset=3` }
    )
    const page2 = factories.makeListItemsPaginated({ count: 5, pageSize: 2 })
    const url1 = expect.stringContaining("offset=0")
    const url2 = expect.stringContaining("offset=3")
    setMockResponse.get(url1, page1)
    setMockResponse.get(url2, page2)
    const { result: itemsQ, waitFor } = renderHook(
      () => useItemsQuery(123, { limit: 3 }),
      { wrapper }
    )

    const { result: moveItem } = renderHook(() => useMoveListItem(mode), {
      wrapper
    })

    await waitFor(() => expect(itemsQ.current.isLoading).toBe(false))

    expect(itemsQ.current.hasNextPage).toBe(true)

    expect(itemsQ.current.data?.pages).toEqual([page1])

    await act(async () => {
      await itemsQ.current.fetchNextPage()
    })

    await waitFor(() => expect(itemsQ.current.data?.pages.length).toBe(2))

    expect(itemsQ.current.data?.pages).toEqual([page1, page2])

    const items = [page1.results, page2.results].flat()

    spies.queryClient.invalidateQueries.mockImplementationOnce(jest.fn())
    await act(async () =>
      moveItem.current.mutateAsync({
        item:     { list_id: 123, item_id: items[3].id },
        position: items[1].position
      })
    )

    const listKeys = {
      userlist:  keys.userList.itemsListing.for(123).all,
      stafflist: keys.staffList.itemsListing.for(123).all
    }
    expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: mode === "userlist" ? listKeys.userlist : listKeys.stafflist
    })
    expect(spies.queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: mode === "stafflist" ? listKeys.userlist : listKeys.stafflist
    })
  }
)
