import type {
  LearningResource,
  PaginatedUserListItems,
  PaginatedUserLists,
  UserListItem
} from "ol-search-ui"
import type { PaginatedResult, PaginationSearchParams } from "ol-util"
import { useMemo } from "react"
import { useQuery, UseQueryResult } from "react-query"
import * as urls from "./urls"

const useResource = (type: string, id: number) => {
  return useQuery<LearningResource>(urls.resource(type, id))
}

const useUserLists = (options?: urls.UserListOptions) => {
  return useQuery<PaginatedUserLists>(urls.userLists(options))
}

const useUserListsData = (options?: urls.UserListOptions) => {
  const userLists = useUserLists(options)
  return useMemo(() => {
    const { data, ...others } = userLists
    const lrData = data && {
      ...data,
      results: data.results
    }
    return {
      data: lrData,
      ...others
    } as UseQueryResult<PaginatedUserLists>
  }, [userLists])
}

const useUserListItems = (listId: number, options?: PaginationSearchParams) => {
  return useQuery<PaginatedUserListItems>(urls.userListItems(listId, options))
}

const useUserListItemsData = (
  listId: number,
  options?: PaginationSearchParams
) => {
  const userListItems = useUserListItems(listId, options)
  return useMemo(() => {
    const { data, ...others } = userListItems
    const lrData = data && {
      ...data,
      results: data.results.map(d => d.content_data)
    }
    return {
      data: lrData,
      ...others
    } as UseQueryResult<PaginatedResult<UserListItem["content_data"]>>
  }, [userListItems])
}

export { useResource, useUserListItemsData, useUserListsData }
