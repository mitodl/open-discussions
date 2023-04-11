import { intersection } from "lodash"
import { QueryClient, useInfiniteQuery } from "react-query"
import type { LearningResourceSearchResult } from "ol-search-ui"
import type {
  Aggregations,
  SearchQueryParams,
  Facets
} from "@mitodl/course-search-utils"
import { buildSearchQuery } from "@mitodl/course-search-utils"
import axios from "../../libs/axios"
import { keys, urls } from "./urls"

const DEFAULT_SEARCH_PAGE_SIZE = 20

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
      activeFacets: restrictFacetTypes(allowedTypes, params.activeFacets)
    } :
    params
  return useInfiniteQuery<SearchResponse>({
    keepPreviousData: true,
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
const modifyCachedSearchResource = (
  queryClient: QueryClient,
  key: Pick<LearningResourceSearchResult, "id" | "object_type">,
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
          hit._source.id === key.id &&
          hit._source.object_type === key.object_type
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
