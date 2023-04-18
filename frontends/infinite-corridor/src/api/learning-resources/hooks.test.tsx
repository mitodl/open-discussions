import React from "react"
import { clone } from "lodash"
import { renderHook } from "@testing-library/react-hooks/dom"
import { act } from "@testing-library/react"
import { faker } from "@faker-js/faker"
import { LearningResourceType as LRT, ListItemMember } from "ol-search-ui"
import { allowConsoleErrors } from "ol-util/src/test-utils"
import * as factories from "ol-search-ui/src/factories"
import { QueryClient, QueryClientProvider } from "react-query"
import {
  useAddToUserListItems,
  useCreateUserList,
  useDeleteFromUserListItems,
  useDeleteUserList,
  useResource,
  useUserListsListing,
  useFavorite,
  useUnfavorite
} from "./hooks"
import { setMockResponse } from "../../test-utils/mockAxios"
import { urls, keys } from "./urls"
import { useInfiniteSearch } from "./search"

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
    }
  }

  return { wrapper, spies }
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
  const { wrapper } = setup()

  /**
   * A test hoook wrapping some useQuery calls and a useMutation call. We'll
   * check that the queries are refetched as expected after the mutation.
   */
  const existingListId = faker.datatype.number()
  const useTestHook = () => {
    const createList = useCreateUserList()
    const existingList = useResource(LRT.Userlist, existingListId)
    const listing = useUserListsListing()
    return { createList, existingList, listing }
  }

  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
  await waitFor(
    () =>
      result.current.existingList.isSuccess && result.current.listing.isSuccess
  )
  const before = result.current
  await act(() =>
    result.current.createList.mutateAsync({ title: "My new list" })
  )
  const after = result.current

  // specific list is still cached
  expect(before.existingList.data).toEqual(after.existingList.data)
  // listing has been re-fetched
  expect(before.listing.data).not.toEqual(after.listing.data)
})

test("useDeleteUserList invalidates all resource queries", async () => {
  const { wrapper } = setup()

  const otherResourceId = faker.datatype.number()

  /**
   * A test hoook wrapping some useQuery calls and a useMutation call. We'll
   * check that the queries are refetched as expected after the mutation.
   */
  const useTestHook = () => {
    const deleteList = useDeleteUserList()
    const otherResource = useResource(LRT.Course, otherResourceId)
    const listing = useUserListsListing()
    return { deleteList, otherResource, listing }
  }

  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
  await waitFor(
    () =>
      result.current.otherResource.isSuccess && result.current.listing.isSuccess
  )
  const before = result.current
  await act(() =>
    result.current.deleteList.mutateAsync(faker.datatype.number())
  )
  const after = result.current

  // other resource is re-fetched. (It could have been in the deleted list.)
  expect(before.otherResource.data).not.toEqual(after.otherResource.data)
  // listing has been re-fetched.
  expect(before.listing.data).not.toEqual(after.listing.data)
})

test("useAddToUserListItems invalidates userlist details and listing", async () => {
  const { wrapper, spies } = setup()

  const list = factories.makeUserList()
  const resource = factories.makeCourse()
  const modifiedAddedResource = {
    ...resource,
    lists: resource.lists.concat({} as ListItemMember)
  }

  const { result: resourceResult } = renderHook(
    () => useResource(resource.object_type, resource.id),
    { wrapper }
  )
  const { result: addResult } = renderHook(() => useAddToUserListItems(), {
    wrapper
  })

  setMockResponse.post(urls.userList.itemAdd(list.id), {
    content_data: modifiedAddedResource
  })

  await act(async () => {
    await addResult.current.mutateAsync({
      userListId: list.id,
      payload:    {
        object_id:    resource.id,
        content_type: resource.object_type
      }
    })
  })

  // The list we modified was invalidated
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.userList.id(list.id).all
  })
  // The list listing was invalided.
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.userList.listing.all
  })
  // Nothing else invalidated
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(2)

  // The POST response result updated resource data
  expect(resourceResult.current.data).toEqual(modifiedAddedResource)
})

test("useAddToUserListItems patches search results", async () => {
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
    const addItem = useAddToUserListItems()
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
    userListId: newMember.list_id,
    payload:    newMember
  })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([expected])
  })
})

test("useDeleteFromUserListItems patches search results", async () => {
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
    const deleteItem = useDeleteFromUserListItems()
    const search = useInfiniteSearch({})
    return { deleteItem, search }
  }
  setMockResponse.post(urls.search, searchResults)
  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([searchResults])
  })

  await result.current.deleteItem.mutateAsync(oldMembers[deleteIndex])

  await waitFor(() => {
    expect(result.current.search.data?.pages).toEqual([expected])
  })
})

test("useDeleteFromUserListItems invalidates appropriate queries", async () => {
  const { wrapper, spies } = setup()

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

  const { result } = renderHook(() => useDeleteFromUserListItems(), { wrapper })

  await act(async () => result.current.mutateAsync(itemToDelete))

  // Check the invalidations
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(3)
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.userList.id(userlist.id).all
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.userList.listing.all
  })
  expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: keys.resource(resource.object_type).id(resource.id).details
  })
})

test("useDeleteFromUserListItems optimistically updates resource data", async () => {
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
  const { result, waitFor } = renderHook(() => useDeleteFromUserListItems(), {
    wrapper
  })

  await waitFor(() => resourceQuery.current.isFetched)

  act(() => {
    result.current.mutateAsync(itemToDelete)
  })

  // Check the optimistic update
  await waitFor(() => {
    expect(resourceQuery.current.data).toEqual(modifiedResource)
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

test("useFavoritesListing pagination", () => {
  // TODO
})

test("useItemListing pagination", () => {
  // TODO
})
