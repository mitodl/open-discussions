import { chunk } from "lodash"
import type {
  LearningResource,
  PaginatedListItems,
  UserList,
  CourseTopic,
  LearningResourceType,
  ListItemMember,
  StaffList
} from "ol-search-ui"
import { PaginatedResult, PaginationSearchParams, arrayMove } from "ol-util"
import axios from "../../libs/axios"
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseQueryOptions,
  useInfiniteQuery,
  InfiniteData
} from "react-query"
import {
  urls,
  keys,
  UserListOptions,
  CourseFilterParams,
  StaffListOptions
} from "./urls"
import { modifyCachedSearchResource } from "./search"
import invariant from "tiny-invariant"
import { QueryFilters } from "react-query/types/core/utils"

const useResource = (type: string, id: number) => {
  const key = keys.resource(type).id(id).details
  return useQuery<LearningResource>(key, async () => {
    const url = urls.resource.details(type, id)
    return axios.get(url).then(res => res.data)
  })
}
const useUserList = (id: number) => {
  return useResource("userlist", id) as UseQueryResult<UserList>
}

const useUserListsListing = (options?: UserListOptions) => {
  const url = urls.userList.listing(options)
  const key = keys.userList.listing.page(options)
  return useQuery<PaginatedResult<UserList>>(key, () =>
    axios.get(url).then(res => res.data)
  )
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
  const queryKey = keys.userList.id(listId).itemsListing.infinite(options)
  const queryFn = ({ pageParam = 0 }): Promise<PaginatedListItems> => {
    const url = urls.userList.itemsListing(listId, {
      ...others,
      offset: pageParam
    })
    return axios.get(url).then(res => res.data)
  }
  return useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage, pages) => {
      const { count } = lastPage
      const pageSize = lastPage.results.length
      const next = pages.length * pageSize
      return next >= count ? undefined : next
    },
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
      queryClient.invalidateQueries({
        queryKey: keys.resource(resource.object_type).id(resource.id).details
      })
      queryClient.invalidateQueries({
        queryKey: keys.favorites.all
      })
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
      queryClient.invalidateQueries({
        queryKey: keys.resource(resource.object_type).id(resource.id).details
      })
      queryClient.invalidateQueries({
        queryKey: keys.favorites.all
      })
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
      queryClient.invalidateQueries({
        queryKey: keys.userList.id(variables.id).details
      })
      queryClient.invalidateQueries({
        queryKey: keys.userList.listing.all
      })
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

type AddToUserListPayload = {
  object_id: number
  content_type: LearningResourceType
}
const addToUserList = async ({
  userListId,
  payload
}: {
  userListId: number
  payload: AddToUserListPayload
}): Promise<ListItemMember & { content_data: LearningResource }> => {
  const { data: response } = await axios.post(
    urls.userList.itemAdd(userListId),
    payload
  )
  return response
}
const useAddToUserListItems = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToUserList,
    // Skip optimistic updates for now. We do not know the list item id.
    onSuccess:  (data, variables) => {
      const resource = data.content_data
      queryClient.setQueryData(
        keys.resource(resource.object_type).id(resource.id).details,
        resource
      )
      queryClient.invalidateQueries({
        queryKey: keys.userList.id(variables.userListId).all
      })
      // The listing response includes item counts, which have changed
      queryClient.invalidateQueries({ queryKey: keys.userList.listing.all })

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

const deleteFromUserListItems = async (item: ListItemMember): Promise<void> => {
  await axios.delete(urls.userList.itemDetails(item.list_id, item.item_id))
}
const useDeleteFromUserListItems = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFromUserListItems,
    onMutate:   vars => {
      const resourceKey = keys
        .resource(vars.content_type)
        .id(vars.object_id).details
      const previousResource =
        queryClient.getQueryData<LearningResource>(resourceKey)
      if (previousResource) {
        const newResource: LearningResource = {
          ...previousResource,
          lists: previousResource.lists.filter(
            member => member.item_id !== vars.item_id
          )
        }
        queryClient.setQueryData(resourceKey, newResource)
      }
      const rollback = () => {
        queryClient.setQueryData(resourceKey, previousResource)
      }
      return { rollback }
    },
    onError: (_error, _var, context) => {
      context?.rollback()
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({
        queryKey: keys.resource(vars.content_type).id(vars.object_id).details
      })
      queryClient.invalidateQueries({
        queryKey: keys.userList.id(vars.list_id).all
      })
      // The listing response includes item counts, which have changed
      queryClient.invalidateQueries({ queryKey: keys.userList.listing.all })
    },
    onSuccess(_data, vars) {
      modifyCachedSearchResource(
        queryClient,
        {
          id:          vars.object_id,
          object_type: vars.content_type
        },
        current => ({
          lists: current.lists?.filter?.(r => r.item_id !== vars.item_id)
        })
      )
    }
  })
}

const useStaffListsListing = (options?: StaffListOptions) => {
  const url = urls.staffList.listing(options)
  const key = keys.staffList.listing.page(options)
  return useQuery<PaginatedResult<StaffList>>(key, () =>
    axios.get(url).then(res => res.data)
  )
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
      queryClient.invalidateQueries({
        queryKey: keys.staffList.id(variables.id).details
      })
      queryClient.invalidateQueries({
        queryKey: keys.staffList.listing.all
      })
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

const useUpcomingCourses = (
  options?: PaginationSearchParams,
  filters?: CourseFilterParams
) => {
  const url = urls.course.upcoming(options, filters)

  const key = keys.courses.listing.all

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const usePopularContent = (options?: PaginationSearchParams) => {
  const url = urls.popularContent.listing(options)

  const key = keys.popularContent.listing.all

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useNewVideos = (options?: PaginationSearchParams) => {
  const url = urls.video.new(options)

  const key = keys.videos.listing.all

  return useQuery<PaginatedResult<LearningResource>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}
type MoveItemPayload = {
  item: Pick<ListItemMember, "item_id" | "list_id">
  newPosition: number
  oldIndex: number
  newIndex: number
}
const moveUserListItem = async ({ item, newPosition }: MoveItemPayload) => {
  const url = urls.userList.itemDetails(item.list_id, item.item_id)
  const body = { position: newPosition }
  await axios.patch(url, body)
}

/**
 * Mutation for moving a list item to a new position.
 *
 * The `mutationFn` requires both the old and new
 *   - the new item `position` (item positions come from the API)
 *   - both the old and new indices within UI array.
 *
 * We use the indices to update the UI immediately, and the positions to make
 * the API call.
 */
const useMoveUserListItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moveUserListItem,
    onMutate:   vars => {
      const queryFilter: QueryFilters = {
        queryKey:  keys.userList.id(vars.item.list_id).itemsListing.all,
        predicate: query => query.state.data !== undefined
      }
      queryClient.setQueriesData<InfiniteData<PaginatedListItems>>(
        queryFilter,
        old => {
          invariant(old, "old data should be defined")
          const items = old.pages.flatMap(page => page.results)
          const newItems = arrayMove(items, vars.oldIndex, vars.newIndex)
          return {
            ...old,
            pages: chunk(newItems, old.pages[0].results.length).map((c, i) => ({
              ...old.pages[i],
              results: c
            }))
          }
        }
      )
      return { queryFilter }
    },
    onSettled: (_data, _error, vars) => {
      const { item } = vars
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
        queryKey: keys.userList.id(item.list_id).itemsListing.all
      })
    },
    onError: (_error, _var, context) => {
      if (context) {
        queryClient.invalidateQueries(context.queryFilter)
      }
    }
  })
}

export {
  useResource, // details
  useUserListItems, // items listing
  useUserList, // details
  useUserListsListing, // listing
  useFavoritesListing, // items listing
  useTopics,
  useCreateUserList, // mutation
  useUpdateUserList, // mutation
  useDeleteUserList, // mutation
  useAddToUserListItems, // mutation
  useDeleteFromUserListItems, // mutation
  useStaffListsListing, // listing
  useCreateStaffList, // mutation
  useUpdateStaffList, // mutation
  useDeleteStaffList, // mutation
  useFavorite, // mutation
  useUnfavorite, // mutation
  useUpcomingCourses, // listing
  usePopularContent, // listing
  useNewVideos, // listing
  useMoveUserListItem // mutation
}
