import React from "react"
import { renderHook } from "@testing-library/react-hooks/dom"
import { act } from "@testing-library/react"
import { faker } from "@faker-js/faker"
import { LearningResourceType as LRT, ListItemMember } from "ol-search-ui"
import { allowConsoleErrors } from "ol-util/build/test-utils"
import * as factories from "ol-search-ui/build/factories"
import { QueryClient, QueryClientProvider } from "react-query"
import {
  useAddToUserListItems,
  useCreateUserList,
  useDeleteFromUserListItems,
  useDeleteUserList,
  useResource,
  useUserListItems,
  useUserListsListing,
  useFavoritesListing,
  useFavorite,
  useUnfavorite
} from "./hooks"
import { setMockResponse } from "../../test-utils/mockAxios"
import { urls } from "./urls"

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

  return { wrapper }
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
  /**
   * This test will use a hook wrapping several react-query useQuery calls
   * and a react-query mutation call (`useAddToUserListItems`).
   *
   * Then, we'll add a list item via `useAddToUserListItems` and check
   * that dependent queries are refetched (their cache should be invalided by
   * the mutation). We'll also check that some other queries are unaffected
   **/

  const { wrapper } = setup()

  const targetListData = factories.makeUserList()
  const otherListData = factories.makeUserList()
  const addedResourceData = factories.makeCourse()
  const modifiedAddedResource = {
    ...addedResourceData,
    lists: addedResourceData.lists.concat({} as ListItemMember)
  }

  const useTestHook = () => {
    const addItem = useAddToUserListItems()
    const addedResource = useResource(
      addedResourceData.object_type,
      addedResourceData.id
    )
    const targetList = useResource(LRT.Userlist, targetListData.id)
    const otherList = useResource(LRT.Userlist, otherListData.id)
    const listing = useUserListsListing()
    const targetItems = useUserListItems(targetListData.id)
    return {
      addedResource,
      addItem,
      targetList,
      otherList,
      listing,
      targetItems
    }
  }

  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
  await waitFor(
    () =>
      result.current.targetList.isSuccess &&
      result.current.otherList.isSuccess &&
      result.current.listing.isSuccess &&
      result.current.targetItems.isSuccess &&
      result.current.addedResource.isSuccess
  )

  setMockResponse.post(urls.userList.itemAdd(targetListData.id), {
    content_data: modifiedAddedResource
  })

  const before = result.current
  await act(async () => {
    await result.current.addItem.mutateAsync({
      userListId: targetListData.id,
      payload:    {
        object_id:    addedResourceData.id,
        content_type: addedResourceData.object_type
      }
    })
  })
  const after = result.current

  // Non-target list refetched
  expect(before.otherList.data).toEqual(after.otherList.data)
  // Listing is refetched (list item counts have changed)
  expect(before.listing.data).not.toEqual(after.listing.data)
  // target list has been refetched
  expect(before.targetList.data).not.toEqual(after.targetList.data)
  // target list items are refetched
  expect(before.targetItems.data).not.toEqual(after.targetItems.data)

  // The resource we added has changed ...
  expect(after.addedResource.data).not.toEqual(before.addedResource.data)
  // ... and comes from POST response
  expect(after.addedResource.data).toEqual(modifiedAddedResource)
})

test("useDeleteFromUserListItems invalidates appropriate queries", async () => {
  /**
   * This test will use a hook wrapping several react-query useQuery calls
   * and a react-query mutation call (`useDeleteFromUserListItems`).
   *
   * Then, we'll delete a list item via `useDeleteFromUserListItems` and check
   * that dependent queries are refetched (their cache should be invalided by
   * the mutation). We'll also check that some other queries are unaffected
   **/
  const { wrapper } = setup()

  const affectedListData = factories.makeUserList()
  const unaffectedListData = factories.makeUserList()
  const itemToDeleteData = factories.makeListItemMember({
    content_type: LRT.Course, // should match affectedResourceData
    list_id:      affectedListData.id
  })

  const affectedResourceData = factories.makeCourse({
    lists: [itemToDeleteData]
  })
  setMockResponse.get(
    urls.resource.details(
      itemToDeleteData.content_type,
      itemToDeleteData.object_id
    ),
    affectedResourceData
  )
  const modifiedResource = { ...affectedResourceData, lists: [] }

  const useTestHook = () => {
    const deleteItem = useDeleteFromUserListItems()
    const affectedResource = useResource(
      itemToDeleteData.content_type,
      itemToDeleteData.object_id
    )
    const affectedList = useResource(LRT.Userlist, affectedListData.id)
    const unaffectedList = useResource(LRT.Userlist, unaffectedListData.id)
    const listing = useUserListsListing()
    const affectedListItems = useUserListItems(affectedListData.id)
    return {
      affectedResource,
      deleteItem,
      affectedList,
      unaffectedList,
      listing,
      affectedListItems
    }
  }

  const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
  await waitFor(
    () =>
      result.current.affectedList.isSuccess &&
      result.current.unaffectedList.isSuccess &&
      result.current.listing.isSuccess &&
      result.current.affectedListItems.isSuccess &&
      result.current.affectedResource.isSuccess
  )

  setMockResponse.get(
    urls.resource.details(
      itemToDeleteData.content_type,
      itemToDeleteData.object_id
    ),
    modifiedResource
  )
  const before = result.current
  await act(async () => {
    await result.current.deleteItem.mutateAsync(itemToDeleteData)
  })
  const after = result.current

  expect(before.affectedResource.data).not.toEqual(after.affectedResource.data)
  expect(before.affectedList.data).not.toEqual(after.affectedList.data)
  expect(before.listing.data).not.toEqual(after.listing.data)
  expect(before.affectedListItems.data).not.toEqual(
    after.affectedListItems.data
  )

  expect(before.unaffectedList.data).toEqual(after.unaffectedList.data)
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
])(
  "$hook.name invalidates appropriate queries",
  async ({ hook, wasFavorite }) => {
    const { wrapper } = setup()
    const targetResourceData = factories.makeCourse({
      is_favorite: wasFavorite
    })
    const otherResourceData = factories.makeCourse()

    const targetResourceUrl = urls.resource.details(
      targetResourceData.object_type,
      targetResourceData.id
    )
    setMockResponse.get(targetResourceUrl, targetResourceData)

    const useTestHook = () => {
      const favoritesListing = useFavoritesListing()
      const mutation = hook()
      const targetResource = useResource(
        targetResourceData.object_type,
        targetResourceData.id
      )
      const otherResource = useResource(
        otherResourceData.object_type,
        otherResourceData.id
      )
      return { mutation, targetResource, favoritesListing, otherResource }
    }
    const { result, waitFor } = renderHook(() => useTestHook(), { wrapper })
    await waitFor(
      () =>
        result.current.targetResource.isSuccess &&
        result.current.favoritesListing.isSuccess &&
        result.current.otherResource.isSuccess
    )

    const before = result.current
    setMockResponse.get(targetResourceUrl, {
      ...targetResourceData,
      is_favorite: !wasFavorite
    })
    await act(async () => {
      await result.current.mutation.mutateAsync(targetResourceData)
    })
    const after = result.current

    // These two are invalidated
    expect(before.targetResource.data).not.toEqual(after.targetResource.data)
    expect(before.favoritesListing.data).not.toEqual(
      after.favoritesListing.data
    )
    // this is not
    expect(before.otherResource.data).toEqual(after.otherResource.data)
  }
)
