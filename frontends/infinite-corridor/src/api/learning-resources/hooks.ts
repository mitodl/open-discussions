import type {
  LearningResource,
  PaginatedUserListItems,
  UserList,
  CourseTopic
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult
} from "react-query"
import { urls, keys, UserListOptions } from "./urls"

const useResource = (type: string, id: number) => {
  const url = urls.resource.details(type, id)
  const key = keys.resource(type).id(id).details
  return useQuery<LearningResource>(key, () =>
    axios.get(url).then(res => res.data)
  )
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

const useFavorites = (options?: PaginationSearchParams) => {
  const url = urls.favorite.listing(options)
  const key = keys.favorites.listing.page(options)
  return useQuery<PaginatedUserListItems>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useTopics = () => {
  const key = keys.topics
  const url = urls.topics.listing
  return useQuery<PaginatedResult<CourseTopic>>(key, () =>
    axios.get(url).then(res => res.data)
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
         * Invalid everything related to learning resources, since any resource
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

export {
  useResource,
  useUserListItems,
  useUserList,
  useUserListsListing,
  useFavorites,
  useTopics,
  useCreateUserList,
  useUpdateUserList,
  useDeleteUserList
}
