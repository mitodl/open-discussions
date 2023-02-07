import type {
  LearningResource,
  PaginatedUserListItems,
  UserList,
  CourseTopic
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import { useMutation, useQuery, useQueryClient, UseQueryResult } from "react-query"
import { urls, keys, UserListOptions } from "./urls"

const useResource = (type: string, id: number) => {
  const url = urls.resourceDetails(type, id)
  const key = keys.resourceDetails(type, id)
  return useQuery<LearningResource>(key, () => axios.get(url).then(res => res.data))
}
const useUserList = (id: number) => {
  return useResource("userlist", id) as UseQueryResult<UserList>
}

const useUserListsListing = (options?: UserListOptions) => {
  const url = urls.userListsListing(options)
  const key = keys.userListsListing(options)
  return useQuery<PaginatedResult<UserList>>(key, () => axios.get(url).then(res => res.data))
}

const useUserListItems = (listId: number, options?: PaginationSearchParams) => {
  return useQuery<PaginatedUserListItems>(urls.userListItems(listId, options))
}

const useFavorites = (
  options?: PaginationSearchParams
) => {
  const url = urls.favoritesListing(options)
  const key = keys.favoritesListing(options)
  return useQuery<PaginatedUserListItems>(
    key, () => axios.get(url).then(res => res.data)
  )
}

const useTopics = () => {
  return useQuery<PaginatedResult<CourseTopic>>(urls.topics())
}

const updateUserList = async (data: Partial<UserList> & { id: number }) => {
  const { data: response } = await axios.patch(urls.updateUserList(data.id), data)
  return response
}
const useUpdateUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(
    updateUserList,
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: keys.userListDetails(variables.id)
        })
        queryClient.invalidateQueries({
          queryKey: keys.userListsListing()
        })
      }
    }
  )
}

const createUserList = async (data: Partial<UserList>) => {
  const { data: response } = await axios.post(urls.createUserList(), data)
  return response
}
const useCreateUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(
    createUserList,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: keys.userListsListing()
        })
      }
    }
  )
}

const deleteUserList = async (id: number) => {
  const { data: response } = await axios.delete(urls.deleteUserList(id))
  return response
}
const useDeleteUserList = () => {
  const queryClient = useQueryClient()
  return useMutation(
    deleteUserList,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: keys.userListsListing()
        })
      }
    }
  )
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
