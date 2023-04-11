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
type TransformedSearchResponse = {
  aggregations: Aggregations
  hits: {
    total: number
    results: LearningResourceSearchResult[]
  }
}

const doSearch = async (
  params: SearchQueryParams
): Promise<TransformedSearchResponse> => {
  const body = buildSearchQuery(params)
  const { data } = await axios.post<SearchResponse>(urls.search, body)
  return {
    aggregations: data.aggregations,
    hits:         {
      total:   data.hits.total,
      results: data.hits.hits.map(hit => hit._source)
    }
  }
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
  return useInfiniteQuery<TransformedSearchResponse>({
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
      pages: TransformedSearchResponse[]
      pageParams: unknown[]
    }
    const newPages = data.pages.map(page => {
      const { results } = page.hits
      const index = results.findIndex(
        result => result.id === key.id && result.object_type === key.object_type
      )
      if (index === -1) return page
      match = true
      const newResult = { ...results[index], ...patcher(results[index]) }
      const newResults = results.map((res, i) =>
        i === index ? newResult : res
      )
      return {
        ...page,
        hits: {
          ...page.hits,
          results: newResults
        }
      }
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
