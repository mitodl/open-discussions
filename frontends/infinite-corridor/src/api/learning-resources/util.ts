import { PaginatedResult } from "ol-util"
import { useInfiniteQuery } from "@tanstack/react-query"
import type {
  UseInfiniteQueryOptions,
  InfiniteData,
  Query,
  QueryClient
} from "@tanstack/react-query"
import type { LearningResource, ListItem } from "ol-search-ui"
import axios from "../../libs/axios"

import { keys } from "./urls"

const useInfiniteLimitOffsetQuery = <T>(
  initialUrl: string,
  options: Omit<UseInfiniteQueryOptions<PaginatedResult<T>>, "queryFn">
) => {
  return useInfiniteQuery<PaginatedResult<T>>({
    ...options,
    queryFn: ({ pageParam = initialUrl }) => {
      return axios.get(pageParam).then(res => res.data)
    },
    getNextPageParam: lastPage => lastPage.next ?? undefined
  })
}

/**
 * Invalidate queries that include the given resource in their response data.
 */
const invalidateResourceQueries = (
  queryClient: QueryClient,
  resource: Pick<LearningResource, "object_type" | "id">
) => {
  const resourceMatch = (
    other: Pick<LearningResource, "object_type" | "id"> | undefined
  ) => other?.id === resource.id && other?.object_type === resource.object_type
  const itemMatch = (item: ListItem | undefined) =>
    resourceMatch(item?.content_data)

  const hasMatchingData = (query: Query) => {
    if (!query.state.data) return false
    const data = query.state.data as
      | PaginatedResult<LearningResource>
      | InfiniteData<PaginatedResult<ListItem>>
    if ("pages" in data) {
      return data.pages.some(p => p?.results.some(itemMatch))
    }
    if ("results" in data) {
      return data.results.some(resourceMatch)
    }
    return false
  }

  queryClient.invalidateQueries({
    queryKey: keys.resource(resource.object_type).id(resource.id).details
  })
  queryClient.invalidateQueries({
    queryKey: keys.resource(resource.object_type).listing.all
  })

  queryClient.invalidateQueries({
    queryKey:  keys.userList.itemsListing.all,
    predicate: hasMatchingData
  })
  queryClient.invalidateQueries({
    queryKey:  keys.staffList.itemsListing.all,
    predicate: hasMatchingData
  })

  queryClient.invalidateQueries({
    queryKey:  keys.popularContent.listing.all,
    predicate: hasMatchingData
  })
  queryClient.invalidateQueries({
    queryKey:  keys.courses.upcoming.all,
    predicate: hasMatchingData
  })
  queryClient.invalidateQueries({
    queryKey:  keys.videos.new.all,
    predicate: hasMatchingData
  })
  queryClient.invalidateQueries({
    queryKey:  keys.favorites.all,
    predicate: hasMatchingData
  })
}

export { useInfiniteLimitOffsetQuery, invalidateResourceQueries }
