import type {
  LearningResource,
  PaginatedUserListItems,
  UserList,
  CourseTopic,
  LearningResourceType,
  ListItemMember
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseQueryOptions
} from "react-query"
import { urls, keys, UserListOptions } from "./urls"
import { modifyCachedSearchResource } from "./search"

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

const useUserListItems = (listId: number, options?: PaginationSearchParams) => {
  const key = keys.userList.id(listId).itemsListing(options)
  const url = urls.userList.itemsListing(listId, options)
  return useQuery<PaginatedUserListItems>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useFavoritesListing = (options?: PaginationSearchParams) => {
  const url = urls.favorite.listing(options)
  const key = keys.favorites.listing.page(options)
  return useQuery<PaginatedUserListItems>(key, () =>
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
        queryKey: keys.favorites.listing.all
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
        queryKey: keys.favorites.listing.all
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
      queryClient.invalidateQueries(
        keys.resource(vars.content_type).id(vars.object_id).details
      )
      queryClient.invalidateQueries(keys.userList.id(vars.list_id).all)
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

export {
  useResource,
  useUserListItems,
  useUserList,
  useUserListsListing,
  useFavoritesListing,
  useTopics,
  useCreateUserList,
  useUpdateUserList,
  useDeleteUserList,
  useAddToUserListItems,
  useDeleteFromUserListItems,
  useFavorite,
  useUnfavorite
}
