import type {
  LearningResource,
  PaginatedUserListItems,
  UserList
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import axios from "../../libs/axios"
import { useQuery, UseQueryResult } from "react-query"
import { urls, keys, UserListOptions } from "./urls"

const useResource = (type: string, id: number) => {
  const url = urls.resourceDetails(type, id)
  const key = keys.resourceDetails(type, id)
  return useQuery<LearningResource>(key, () =>
    axios.get(url).then(res => res.data)
  )
}
const useUserList = (id: number) => {
  return useResource("userlist", id) as UseQueryResult<UserList>
}

const useUserListsListing = (options?: UserListOptions) => {
  const url = urls.userListsListing(options)
  const key = keys.userListsListing(options)
  return useQuery<PaginatedResult<UserList>>(key, () =>
    axios.get(url).then(res => res.data)
  )
}

const useUserListItems = (listId: number, options?: PaginationSearchParams) => {
  return useQuery<PaginatedUserListItems>(urls.userListItems(listId, options))
}

export { useResource, useUserListItems, useUserList, useUserListsListing }
