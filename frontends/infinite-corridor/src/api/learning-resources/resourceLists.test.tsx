import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { faker } from "@faker-js/faker/locale/en"
import { setMockResponse, act } from "../../test-utils"
import { invalidateResourceQueries } from "./util"
import { keys, urls } from "./urls"
import { LearningResourceType as LR, LearningResource } from "ol-search-ui"
import {
  makeCourse,
  makeLearningResource,
  makeListItem,
  makeListItemMember,
  makeSearchResponse,
  makeStaffList,
  makeUserList
} from "ol-search-ui/src/factories"

import {
  useAddToListItems,
  useCreateStaffList,
  useCreateUserList,
  useDeleteFromListItems,
  useDeleteStaffList,
  useDeleteUserList,
  useMoveListItem,
  useUpdateStaffList,
  useUpdateUserList
} from "./resourceLists"
import { useResource } from "./resources"
import { ControlledPromise } from "ol-util/src/test-utils"
import axios from "../../libs/axios"
import { clone } from "lodash"
import { useInfiniteSearch } from "./search"

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

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    listType:  "UserList",
    listUrls:  urls.userList,
    listKeys:  keys.userList,
    useCreate: useCreateUserList,
    useUpdate: useUpdateUserList,
    useDelete: useDeleteUserList,
    makeList:  makeUserList
  },
  {
    listType:  "StaffList",
    listUrls:  urls.staffList,
    listKeys:  keys.staffList,
    useCreate: useCreateStaffList,
    useUpdate: useUpdateStaffList,
    useDelete: useDeleteStaffList,
    makeList:  makeStaffList
  }
] as const)(
  "$listType Mutations",
  ({ makeList, useCreate, listUrls, listKeys, useUpdate, useDelete }) => {
    test("$useCreate invalidates only $listType listsings", async () => {
      const { wrapper, spies } = setup()

      const { result } = renderHook(() => useCreate(), { wrapper })

      const list = makeList()
      setMockResponse.post(listUrls.create, list)
      await act(() => result.current.mutateAsync({ title: list.title }))

      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: listKeys.listing.all
      })
      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
    })

    test("$useDelete invalidates all resource queries", async () => {
      const { wrapper, spies } = setup()

      const { result } = renderHook(() => useDelete(), { wrapper })

      const list = makeList()
      setMockResponse.delete(listUrls.details(list.id), null)
      await act(() => result.current.mutateAsync(list.id))

      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: keys.all
      })
      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
    })

    test("$useUpdate calls invalidateResourceQueries", async () => {
      const { wrapper, spies } = setup()

      const { result } = renderHook(() => useUpdate(), { wrapper })

      const list = makeList()
      setMockResponse.patch(listUrls.details(list.id), list)
      await act(() =>
        result.current.mutateAsync(
          // @ts-expect-error TS has trouble with the correlation between list & useUpdate:
          // argument 'A | B' is not passable to function with type '(A) => ... | (B) => ...'
          list
        )
      )

      expect(spies.invalidateResourceQueries).toHaveBeenCalledWith(
        expect.anything(),
        {
          object_type:
            useUpdate === useUpdateUserList ? LR.Userlist : LR.StaffList,
          id: list.id
        }
      )
      expect(spies.invalidateResourceQueries).toHaveBeenCalledTimes(1)
    })
  }
)

describe("useAddToListItems", () => {
  it.each([
    () => {
      const list = makeUserList()
      const addItemUrl = urls.userList.itemAdd(list.id)
      const item = makeListItemMember()
      const resource = makeCourse()
      const resourceUrl = urls.resource.details(
        resource.object_type,
        resource.id
      )
      const resourcePatch = { lists: resource.lists.concat(item) }
      return { list, addItemUrl, resource, resourcePatch, resourceUrl }
    },
    () => {
      const list = makeStaffList()
      const addItemUrl = urls.staffList.itemAdd(list.id)
      const item = makeListItemMember()
      const resource = makeCourse()
      const resourcePatch = { stafflists: resource.stafflists.concat(item) }
      const resourceUrl = urls.resource.details(
        resource.object_type,
        resource.id
      )
      return { list, addItemUrl, resource, resourcePatch, resourceUrl }
    }
  ])(
    "makes correct API call and delegates to invalidateResourceQueries",
    async getData => {
      const { wrapper, spies } = setup()
      const { resource, list, addItemUrl, resourcePatch } = getData()

      const modifiedAddedResource = { ...resource, ...resourcePatch }
      const { result: addResult } = renderHook(useAddToListItems, { wrapper })

      setMockResponse.post(addItemUrl, { content_data: modifiedAddedResource })

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
    }
  )

  it.each([
    () => {
      const list = makeUserList()
      const addItemUrl = urls.userList.itemAdd(list.id)
      const item = makeListItemMember()
      const resource = makeCourse()
      const resourceUrl = urls.resource.details(
        resource.object_type,
        resource.id
      )
      const resourcePatch = { lists: resource.lists.concat(item) }
      return { list, addItemUrl, resource, resourcePatch, resourceUrl }
    },
    () => {
      const list = makeStaffList()
      const addItemUrl = urls.staffList.itemAdd(list.id)
      const item = makeListItemMember()
      const resource = makeCourse()
      const resourcePatch = { stafflists: resource.stafflists.concat(item) }
      const resourceUrl = urls.resource.details(
        resource.object_type,
        resource.id
      )
      return { list, addItemUrl, resource, resourcePatch, resourceUrl }
    }
  ])("Updates the useRsource query cache", async getData => {
    const { wrapper } = setup()
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
    const { result: addResult } = renderHook(useAddToListItems, { wrapper })

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

    // The POST response result updated resource data
    // (ControlledPromise not yet resolved)
    await waitFor(() => {
      expect(resourceResult.current.data).toEqual(modifiedAddedResource)
    })
  })

  it("useAddToListItems patches search results", async () => {
    const { wrapper } = setup()
    const searchResults = makeSearchResponse(4, 10)
    const i = faker.datatype.number({ min: 0, max: 3 })
    const searchResource = searchResults.hits.hits[i]._source
    const oldMember = makeListItemMember()
    const newMember = makeListItemMember()

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
    const { result } = renderHook(() => useTestHook(), { wrapper })

    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([searchResults])
    })

    setMockResponse.post(urls.userList.itemAdd(newMember.list_id), {
      content_data: makeLearningResource({
        id:          searchResource.id,
        object_type: searchResource.object_type,
        lists:       [oldMember, newMember]
      })
    })
    await result.current.addItem.mutateAsync({
      list: { id: newMember.list_id, object_type: LR.Userlist },
      item: newMember
    })

    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([expected])
    })
  })
})

describe("useDeleteFromListItems", () => {
  it.each([
    () => {
      const list = makeUserList()
      const item = makeListItemMember()
      const itemUrl = urls.userList.itemDetails(list.id, item.item_id)
      return { list, item, itemUrl }
    },
    () => {
      const list = makeStaffList()
      const item = makeListItemMember()
      const itemUrl = urls.staffList.itemDetails(list.id, item.item_id)
      return { list, item, itemUrl }
    }
  ])(
    "makes correct API call and invalidates appropriate queries",
    async getData => {
      const { list, itemUrl, item } = getData()
      const { wrapper, spies } = setup()

      const { result } = renderHook(useDeleteFromListItems, { wrapper })

      setMockResponse.delete(itemUrl, null)
      await act(async () => result.current.mutateAsync({ list, item }))

      expect(axios.delete).toHaveBeenCalledWith(itemUrl)

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

  it("optimistically updates resource data", async () => {
    const { wrapper } = setup()

    const list = makeUserList()
    const item = makeListItemMember({
      content_type: LR.Course, // should match affectedResourceData
      list_id:      list.id
    })

    const resource = makeCourse({ id: item.object_id, lists: [item] })
    const resourceUrl = urls.resource.details(resource.object_type, resource.id)
    setMockResponse.get(resourceUrl, resource)
    const modifiedResource = { ...resource, lists: [] }

    const { result: resourceQuery } = renderHook(
      () => useResource(resource.object_type, resource.id),
      { wrapper }
    )
    const { result } = renderHook(useDeleteFromListItems, { wrapper })

    await waitFor(() => {
      expect(resourceQuery.current.isFetched).toBe(true)
    })

    const itemUrl = urls.userList.itemDetails(list.id, item.item_id)
    setMockResponse.delete(itemUrl, null)
    act(() => result.current.mutate({ list: list, item }))

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

  it("patches search results", async () => {
    const makeData = () => {
      const initialResponse = makeSearchResponse(4, 10)
      const i = faker.datatype.number({ min: 0, max: 3 })
      const affectedResource = initialResponse.hits.hits[i]._source
      const deleteIndex = faker.datatype.number({ min: 0, max: 1 })
      const initialItems = [makeListItemMember(), makeListItemMember()]
      const itemToDelete = initialItems[deleteIndex]

      // two items initially
      affectedResource.lists = initialItems
      // Now one item
      const patchedResponse = clone(initialResponse)
      patchedResponse.hits.hits[i]._source = {
        ...affectedResource,
        lists: initialItems.filter(item => item !== itemToDelete)
      }
      return {
        initialResponse,
        patchedResponse,
        itemToDelete
      }
    }
    const { initialResponse, patchedResponse, itemToDelete } = makeData()
    const { wrapper } = setup()

    const useTestHook = () => {
      const deleteItem = useDeleteFromListItems()
      const search = useInfiniteSearch({})
      return { deleteItem, search }
    }
    setMockResponse.post(urls.search, initialResponse)
    const { result } = renderHook(() => useTestHook(), { wrapper })

    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([initialResponse])
    })

    setMockResponse.delete(
      urls.userList.itemDetails(itemToDelete.list_id, itemToDelete.item_id),
      null
    )
    await result.current.deleteItem.mutateAsync({
      list: { id: itemToDelete.list_id, object_type: LR.Userlist },
      item: itemToDelete
    })

    await waitFor(() => {
      expect(result.current.search.data?.pages).toEqual([patchedResponse])
    })
  })
})

describe("useMoveListItem", () => {
  it.each([
    {
      mode:            "userlist",
      listUrls:        urls.userList,
      itemsListingKey: keys.userList.itemsListing
    },
    {
      mode:            "stafflist",
      listUrls:        urls.staffList,
      itemsListingKey: keys.staffList.itemsListing
    }
  ] as const)(
    "invalidates appropriate queries",
    async ({ mode, itemsListingKey, listUrls }) => {
      const item = makeListItem()
      const { wrapper, spies } = setup()

      const { result: moveItem } = renderHook(() => useMoveListItem(mode), {
        wrapper
      })

      setMockResponse.patch(listUrls.itemDetails(123, item.id), null)
      await act(async () =>
        moveItem.current.mutateAsync({
          item:     { list_id: 123, item_id: item.id },
          position: item.position
        })
      )

      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: itemsListingKey.for(123).all
      })
      expect(spies.queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
    }
  )
})
