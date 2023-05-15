import {
  LearningResource,
  PaginatedListItems,
  UserList,
  CourseTopic,
  LearningResourceType as LRT,
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
import {
  urls,
  keys,
  UserListOptions,
  StaffListOptions,
  CourseOptions
} from "./urls"
import { modifyCachedSearchResource } from "./search"
import { invalidateResourceQueries, useInfiniteLimitOffsetQuery } from "./util"

const useResource = (
  type: string,
  id: number,
  options: Pick<UseQueryOptions, "enabled"> = {}
) => {
  const key = keys.resource(type).id(id).details
  return useQuery<LearningResource>(
    key,
    async () => {
      const url = urls.resource.details(type, id)
      return axios.get(url).then(res => res.data)
    },
    options
  )
}
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
  return useResource(LRT.StaffList, id, options) as UseQueryResult<StaffList>
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

const useFavoritesListing = (options?: PaginationSearchParams) => {
  const url = urls.favorite.listing(options)
  const key = keys.favorites.listing.page(options)
  return useQuery<PaginatedListItems>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useFavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (resource: LearningResource) => {
      const url = urls.resource.favorite(resource.object_type, resource.id)
      return axios.post(url).then(res => res.data)
    },
    onSuccess(_data, resource) {
      queryClient.invalidateQueries({ queryKey: keys.favorites.all })
      invalidateResourceQueries(queryClient, resource)
      modifyCachedSearchResource(
        queryClient,
        {
          id:          resource.id,
          object_type: resource.object_type
        },
        () => ({ is_favorite: true })
      )
    }
  })
}

const useUnfavorite = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (resource: LearningResource) => {
      const url = urls.resource.unfavorite(resource.object_type, resource.id)
      return axios.post(url).then(res => res.data)
    },
    onSuccess(_data, resource) {
      invalidateResourceQueries(queryClient, resource)
      modifyCachedSearchResource(
        queryClient,
        {
          id:          resource.id,
          object_type: resource.object_type
        },
        () => ({ is_favorite: false })
      )
    }
  })
}

const useTopics = (opts?: Pick<UseQueryOptions, "enabled">) => {
  const key = keys.topics
  const url = urls.topics.listing
  return useQuery<PaginatedResult<CourseTopic>>(
    key,
    () => axios.get(url).then(res => res.data),
    opts
  )
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
      const resource = { object_type: LRT.Userlist, id: variables.id }
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
      const resource = { object_type: LRT.StaffList, id: variables.id }
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

const useUpcomingCourses = (options?: CourseOptions) => {
  const url = urls.course.upcoming(options)

  const key = keys.courses.upcoming.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const usePopularContent = (options?: PaginationSearchParams) => {
  const url = urls.popularContent.listing(options)

  const key = keys.popularContent.listing.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useNewVideos = (options?: PaginationSearchParams) => {
  const url = urls.video.new(options)

  const key = keys.videos.new.page(options)

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
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
      /**
       * We did an optimistic update that re-ordered the list for the UI.
       * But the API calls are based on list items' `position` property, not
       * their index within the list.
       *
       * The position properties are incorrect after our reordering, so re-fetch
       * the list.
       *
       * Since the listing is an InfiniteQuery, this invalidates all pages,
       * which could be slow if several pages are showing. In practice, usually
       * only one page (max 50 items) is showing.
       */
      queryClient.invalidateQueries({
        queryKey: listingKey(vars.item.list_id)
      })
    }
  })
}

export {
  useResource, // details
  useUserListItems, // items listing
  useUserList, // details
  useStaffList, // details
  useStaffListItems, // items listing
  useUserListsListing, // listing
  useFavoritesListing, // items listing
  useTopics,
  useCreateUserList, // mutation
  useUpdateUserList, // mutation
  useDeleteUserList, // mutation
  useAddToListItems, // mutation
  useDeleteFromListItems, // mutation
  useStaffListsListing, // listing
  useCreateStaffList, // mutation
  useUpdateStaffList, // mutation
  useDeleteStaffList, // mutation
  useFavorite, // mutation
  useUnfavorite, // mutation
  useUpcomingCourses, // listing
  usePopularContent, // listing
  useNewVideos, // listing
  useMoveListItem // mutation
}
