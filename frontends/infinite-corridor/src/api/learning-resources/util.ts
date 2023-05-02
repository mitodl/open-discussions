import { PaginatedResult } from "ol-util"
import { useInfiniteQuery } from "react-query"
import type { UseInfiniteQueryOptions } from "react-query"
import axios from "../../libs/axios"

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

export { useInfiniteLimitOffsetQuery }
