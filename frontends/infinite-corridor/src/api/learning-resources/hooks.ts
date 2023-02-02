import type {
  LearningResource,
  PaginatedUserListItems,
  UserList,
  UserListItem
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import { useMemo } from "react"
import { useQuery, UseQueryResult } from "react-query"
import * as urls from "./urls"

const useResource = (type: string, id: number) => {
  return useQuery<LearningResource>(urls.resource(type, id))
}
const useUserList = (id: number) => {
  return useResource("userlist", id) as UseQueryResult<UserList>
}

/**
 *
 */
const useContentData = <D>(
  query: UseQueryResult<PaginatedResult<{ content_data: D }>>
) => {
  return useMemo(() => {
    const { data, ...others } = query
    const contentData = data && {
      ...data,
      results: data.results.map(d => d.content_data)
    }
    return {
      data: contentData,
      ...others
    } as UseQueryResult<PaginatedResult<D>>
  }, [query])
}

const useUserListsListing = (options?: urls.UserListOptions) => {
  return useQuery<PaginatedResult<UserList>>(urls.userLists(options))
}

const useUserListItems = (listId: number, options?: PaginationSearchParams) => {
  return useQuery<PaginatedUserListItems>(urls.userListItems(listId, options))
}

const useUserListItemsData = (
  listId: number,
  options?: PaginationSearchParams
): UseQueryResult<PaginatedResult<LearningResource>> => {
  const userListItems = useUserListItems(listId, options)
  return useContentData(userListItems)
}

const useFavoritesData = (
  options?: PaginationSearchParams
): UseQueryResult<PaginatedResult<LearningResource>> => {
  const userListItems = useQuery<PaginatedUserListItems>(
    urls.favorites(options)
  )
  return useContentData(userListItems)
}

export {
  useResource,
  useUserListItemsData,
  useUserList,
  useUserListsListing,
  useFavoritesData
}
