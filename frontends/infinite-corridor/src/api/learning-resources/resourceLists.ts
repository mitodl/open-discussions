import {
  LearningResource,
  UserList,
  LearningResourceType as LR,
  ListItemMember,
  StaffList,
  ListItem,
  LearningResourceRef,
  isUserListOrPath
} from "ol-search-ui"
import { PaginatedResult, PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseQueryOptions
} from "@tanstack/react-query"
import { urls, keys, UserListOptions, StaffListOptions } from "./urls"
import { modifyCachedSearchResource } from "./search"
import { invalidateResourceQueries, useInfiniteLimitOffsetQuery } from "./util"
import { useResource } from "./resources"

const useUserList = (
  id: number,
  options: Pick<UseQueryOptions, "enabled"> = {}
) => {
  return useResource("userlist", id, options) as UseQueryResult<UserList>
}

const useStaffList = (
  id: number,
  options: Pick<UseQueryOptions, "enabled"> = {}
) => {
  return useResource(LR.StaffList, id, options) as UseQueryResult<StaffList>
}

const useUserListsListing = (
  options: UserListOptions & Pick<UseQueryOptions, "enabled"> = {}
) => {
  const { enabled, ...others } = options
  const url = urls.userList.listing(others)
  const queryKey = keys.userList.listing.page(others)
  return useQuery<PaginatedResult<UserList>>({
    queryKey,
    queryFn: () => axios.get(url).then(res => res.data),
    enabled
  })
}

/**
 * Note: this is an InfiniteQuery, so the data is an array of pages.
 */
const useUserListItems = (
  listId: number,
  options: Omit<PaginationSearchParams, "offset"> &
    Pick<UseQueryOptions, "enabled"> = {}
) => {
  const { enabled, ...others } = options
  const queryKey = keys.userList.itemsListing.for(listId).infinite(options)
  const initialUrl = urls.userList.itemsListing(listId, {
    ...others,
    offset: 0
  })
  return useInfiniteLimitOffsetQuery<ListItem>(initialUrl, {
    queryKey,
    enabled
  })
}

/**
 * Note: this is an InfiniteQuery, so the data is an array of pages.
 */
const useStaffListItems = (
  listId: number,
  options: Omit<PaginationSearchParams, "offset"> &
    Pick<UseQueryOptions, "enabled"> = {}
) => {
  const { enabled, ...others } = options
  const queryKey = keys.staffList.itemsListing.for(listId).infinite(options)
  const initialUrl = urls.staffList.itemsListing(listId, {
    ...others,
    offset: 0
  })
  return useInfiniteLimitOffsetQuery<ListItem>(initialUrl, {
    queryKey,
    enabled
  })
}

const updateUserList = async (data: Partial<UserList> & { id: number }) => {
  const url = urls.userList.details(data.id)
  const { data: response } = await axios.patch(url, data)
  return response
}
const useUpdateUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(updateUserList, {
    onSuccess: (_data, variables) => {
      const resource = { object_type: LR.Userlist, id: variables.id }
      invalidateResourceQueries(queryClient, resource)
    }
  })
}

const createUserList = async (data: Partial<UserList>) => {
  const url = urls.userList.create
  const { data: response } = await axios.post(url, data)
  return response
}
const useCreateUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(createUserList, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.userList.listing.all
      })
    }
  })
}

const deleteUserList = async (id: number) => {
  const { data: response } = await axios.delete(urls.userList.details(id))
  return response
}
const useDeleteUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(deleteUserList, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        /**
         * Invalidate everything related to learning resources, since any resource
         * could have belonged to this list.
         *
         * This is a little bit overzealous, e.g., we do not really need to
         * invalidate topics and favorites.
         */
        queryKey: keys.all
      })
    }
  })
}

const addToUserList = async ({
  list,
  item
}: {
  list: Pick<UserList | StaffList, "id" | "object_type">
  item: LearningResourceRef
}): Promise<ListItemMember & { content_data: LearningResource }> => {
  const url = isUserListOrPath(list) ?
    urls.userList.itemAdd(list.id) :
    urls.staffList.itemAdd(list.id)
  const { data: response } = await axios.post(url, item)
  return response
}
const useAddToListItems = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToUserList,
    onSuccess:  (data, variables) => {
      const resource = data.content_data
      const { list } = variables
      queryClient.setQueryData<LearningResource>(
        keys.resource(resource.object_type).id(resource.id).details,
        old => {
          if (!old) return undefined
          return { ...old, ...data.content_data }
        }
      )
      invalidateResourceQueries(queryClient, resource),
      invalidateResourceQueries(queryClient, list)

      modifyCachedSearchResource(
        queryClient,
        {
          id:          resource.id,
          object_type: resource.object_type
        },
        () => ({ lists: resource.lists })
      )
    }
  })
}

const deleteFromUserListItems = async ({
  list,
  item
}: {
  list: Pick<UserList | StaffList, "id" | "object_type">
  item: ListItemMember
}) => {
  const url = isUserListOrPath(list) ?
    urls.userList.itemDetails(list.id, item.item_id) :
    urls.staffList.itemDetails(list.id, item.item_id)
  await axios.delete(url)
}
const useDeleteFromListItems = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFromUserListItems,
    onSuccess(_data, vars) {
      const { item, list } = vars
      const resource = { object_type: item.content_type, id: item.object_id }
      invalidateResourceQueries(queryClient, resource),
      invalidateResourceQueries(queryClient, list)
      queryClient.setQueryData<LearningResource>(
        keys.resource(resource.object_type).id(resource.id).details,
        old => {
          if (!old) return undefined
          const listKey = isUserListOrPath(list) ? "lists" : "stafflists"
          return {
            ...old,
            [listKey]: old[listKey].filter(x => x.item_id !== item.item_id)
          }
        }
      )
      modifyCachedSearchResource(
        queryClient,
        {
          id:          item.object_id,
          object_type: item.content_type
        },
        current => ({
          lists: current.lists?.filter?.(r => r.item_id !== item.item_id)
        })
      )
    }
  })
}

const useStaffListsListing = (
  options: StaffListOptions & Pick<UseQueryOptions, "enabled"> = {}
) => {
  const { enabled, ...others } = options
  const url = urls.staffList.listing(others)
  const queryKey = keys.staffList.listing.page(others)
  return useQuery<PaginatedResult<StaffList>>({
    queryKey,
    queryFn: () => axios.get(url).then(res => res.data),
    enabled
  })
}

const updateStaffList = async (data: Partial<StaffList> & { id: number }) => {
  const url = urls.staffList.details(data.id)
  const { data: response } = await axios.patch(url, data)
  return response
}
const useUpdateStaffList = () => {
  const queryClient = useQueryClient()
  return useMutation(updateStaffList, {
    onSuccess: (_data, variables) => {
      const resource = { object_type: LR.StaffList, id: variables.id }
      invalidateResourceQueries(queryClient, resource)
    }
  })
}

const createStaffList = async (data: Partial<StaffList>) => {
  const url = urls.staffList.create
  const { data: response } = await axios.post(url, data)
  return response
}
const useCreateStaffList = () => {
  const queryClient = useQueryClient()
  return useMutation(createStaffList, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.staffList.listing.all
      })
    }
  })
}

const deleteStaffList = async (id: number) => {
  const { data: response } = await axios.delete(urls.staffList.details(id))
  return response
}
const useDeleteStaffList = () => {
  const queryClient = useQueryClient()
  return useMutation(deleteStaffList, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        /**
         * Invalidate everything related to learning resources, since any resource
         * could have belonged to this list.
         *
         * This is a little bit overzealous, e.g., we do not really need to
         * invalidate topics and favorites.
         */
        queryKey: keys.all
      })
    }
  })
}

type MoveItemPayload = {
  item: Pick<ListItemMember, "item_id" | "list_id">
  position: number
}
const moveUserListItem = async ({ item, position }: MoveItemPayload) => {
  const url = urls.userList.itemDetails(item.list_id, item.item_id)
  const body = { position }
  await axios.patch(url, body)
}
const moveStaffListItem = async ({ item, position }: MoveItemPayload) => {
  const url = urls.staffList.itemDetails(item.list_id, item.item_id)
  const body = { position }
  await axios.patch(url, body)
}

/**
 * Mutation for moving a list item to a new position.
 */
const useMoveListItem = (mode: "userlist" | "stafflist") => {
  const queryClient = useQueryClient()
  const mutationFn = mode === "userlist" ? moveUserListItem : moveStaffListItem
  const listingKey = (id: number) =>
    mode === "userlist" ?
      keys.userList.itemsListing.for(id).all :
      keys.staffList.itemsListing.for(id).all
  return useMutation({
    mutationFn,
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({
        queryKey: listingKey(vars.item.list_id)
      })
    }
  })
}

export {
  // userlist queries
  useUserList,
  useUserListsListing,
  useUserListItems,
  // stafflist queries
  useStaffList,
  useStaffListsListing,
  useStaffListItems,
  // userlist mutations
  useCreateUserList,
  useUpdateUserList,
  useDeleteUserList,
  // stafflist mutations
  useCreateStaffList,
  useUpdateStaffList,
  useDeleteStaffList,
  // items mutations
  useAddToListItems,
  useDeleteFromListItems,
  useMoveListItem
}
