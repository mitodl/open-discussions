import { intersection } from "lodash"
import { QueryClient, useInfiniteQuery } from "@tanstack/react-query"
import type { LearningResourceSearchResult } from "ol-search-ui"
import type {
  Aggregations,
  SearchQueryParams,
  Facets
} from "@mitodl/course-search-utils"
import { buildSearchQuery } from "@mitodl/course-search-utils"
import axios from "../../libs/axios"
import { keys, urls } from "./urls"

const DEFAULT_SEARCH_PAGE_SIZE = 10

type SearchResponse = {
  aggregations: Aggregations
  hits: {
    total: number
    hits: { _source: LearningResourceSearchResult }[]
  }
}

const doSearch = async (params: SearchQueryParams): Promise<SearchResponse> => {
  const body = buildSearchQuery(params)
  const { data } = await axios.post<SearchResponse>(urls.search, body)
  return data
}
const restrictFacetTypes = (allowedTypes: string[], facets?: Facets) => {
  const facetTypes = facets?.["type"] ?? []
  const normalized =
    facetTypes.length > 0 ?
      intersection(facetTypes, allowedTypes) :
      allowedTypes
  return { ...facets, type: normalized }
}

type InfiniteSearchOptions = Omit<SearchQueryParams, "from"> & {
  allowedTypes?: string[]
}

const useInfiniteSearch = (params: InfiniteSearchOptions) => {
  const { size = DEFAULT_SEARCH_PAGE_SIZE, allowedTypes } = params
  const normalized: SearchQueryParams = allowedTypes ?
    {
      ...params,
      activeFacets:  restrictFacetTypes(allowedTypes, params.activeFacets),
      resourceTypes: allowedTypes
    } :
    params
  return useInfiniteQuery<SearchResponse>({
    keepPreviousData: true,
    /**
     * React query caches query results. If no currently mounted components are
     * using a query, then it is inactive. Inactive queries are removed from the
     * cache after `cacheTime`. The default is 5 minutes.
     *
     * Let's use a smaller cache time here since search requests can fire pretty
     * frequently.
     */
    cacheTime:        1000 * 60,
    queryKey:         keys.search.pages(normalized),
    queryFn:          ({ pageParam = 0 }) =>
      doSearch({ ...normalized, size, from: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      const nextFrom = pages.length * size
      if (nextFrom >= lastPage.hits.total) return undefined
      return nextFrom
    }
  })
}

type SearchPatcher = (
  current: LearningResourceSearchResult
) => Partial<LearningResourceSearchResult>

/**
 * Modify a cached search result.
 *
 * This is useful when a mutation affects learning resources that show up in
 * search results. (Example: marking a resource as "favorite".)
 *
 * @param queryClient
 * @param resourceKey id and object_type identifying resource
 * @param patcher A function mapping current LearningResourceSearchResult to a
 * to a patch that will be bemerged into the cached LearningResourceSearchResult
 */
const modifyCachedSearchResource = (
  queryClient: QueryClient,
  resourceKey: Pick<LearningResourceSearchResult, "id" | "object_type">,
  patcher: SearchPatcher
) => {
  const cache = queryClient.getQueryCache()
  const searchQueries = cache.findAll(keys.search.all)
  searchQueries.forEach(query => {
    let match = false
    const data = query.state.data as {
      pages: SearchResponse[]
      pageParams: unknown[]
    }
    const newPages = data.pages.map(page => {
      const { hits } = page.hits
      const index = hits.findIndex(
        hit =>
          hit._source.id === resourceKey.id &&
          hit._source.object_type === resourceKey.object_type
      )
      if (index === -1) return page
      match = true
      const newHit = {
        ...hits[index],
        _source: {
          ...hits[index]._source,
          ...patcher(hits[index]._source)
        }
      }
      const newResults = hits.map((res, i) => (i === index ? newHit : res))
      const newPage: SearchResponse = {
        ...page,
        hits: {
          ...page.hits,
          hits: newResults
        }
      }
      return newPage
    })

    if (match) {
      queryClient.setQueryData(query.queryKey, {
        ...data,
        pages: newPages
      })
    }
  })
}

export { useInfiniteSearch, modifyCachedSearchResource }
