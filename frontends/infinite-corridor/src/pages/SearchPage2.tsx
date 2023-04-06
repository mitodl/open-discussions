/* global SETTINGS:false */
import React, { useState, useCallback, useMemo } from "react"
import Container from "@mui/material/Container"
import { intersection } from "lodash"
import { BannerPage, useMuiBreakpoint } from "ol-util"
import InfiniteScroll from "react-infinite-scroller"
import {
  useCourseSearch,
  buildSearchQuery,
  Aggregations,
  Aggregation,
  SearchQueryParams,
  Facets,
  useSearchInputs,
  getFacetOptions
} from "@mitodl/course-search-utils"
import {
  LearningResourceSearchResult,
  SearchInput,
  SearchFilterDrawer,
  FacetManifest
} from "ol-search-ui"
import { GridColumn, GridContainer } from "../components/layout"
import { useInfiniteQuery } from "react-query"
import axios from "../libs/axios"

import LearningResourceCard from "../components/LearningResourceCard"
import { useHistory } from "react-router"

const ALLOWED_TYPES = ["program", "course"]
const pageSize = SETTINGS.search_page_size

const facetMap: FacetManifest = [
  ["certification", "Certificates"],
  ["type", "Learning Resource"],
  ["offered_by", "Offered By"]
]

interface Result {
  _source: LearningResourceSearchResult
}

const SEARCH_API_URL = "https://discussions-rc.odl.mit.edu/api/v0/search/"

const doSearch = async (params: SearchQueryParams) => {
  const body = buildSearchQuery(params)
  const { data } = await axios.post(SEARCH_API_URL, body)
  return data
}

const useInfiniteSearch = (params: Omit<SearchQueryParams, "from">) => {
  if (params.activeFacets?.["type"]?.length > 0) {
    params.activeFacets["type"] = intersection(params.activeFacets["type"], ALLOWED_TYPES)
  } else {
    params.activeFacets = {
      ...params.activeFacets,
      type: ALLOWED_TYPES
    }
  }
  console.log(params)
  return useInfiniteQuery({
    keepPreviousData: true,
    queryKey:         ["search", params],
    queryFn:          ({ pageParam = 0 }) => doSearch({ ...params, from: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (pages.length * pageSize >= lastPage.hits.total) return undefined
      return pages.length * pageSize
    }
  })
}

const SearchPage: React.FC = () => {
  const isMd = useMuiBreakpoint("md")
  const [searchText, setSearchText] = useState("")

  const history = useHistory()
  const {
    updateText,
    text,
    onUpdateFacets,
    clearAllFilters,
    toggleFacet,
    activeFacets,
    setText,
  } = useSearchInputs(history)

  const search = useInfiniteSearch({
    text: searchText,
    activeFacets
  })
  const aggregations = useMemo(() => {
    return new Map(Object.entries(search.data?.pages[0].aggregations ?? {})) as Aggregations
  }, [search.data?.pages])
  const facetOptions = useCallback(
    (group: string) => getFacetOptions(aggregations, activeFacets, group),
    [aggregations, activeFacets]
  )

  const clearText = useCallback(() => {
    setText("")
    setSearchText("")
  }, [setText])
  const onSubmit = () => {
    setSearchText(text)
  }
  const results = useMemo(() => {
    return search.data?.pages.flatMap(page => page.hits.hits) || []
  }, [search.data])
  const { fetchNextPage } = search
  const loadMore = useCallback((page: number) => {
    fetchNextPage({ pageParam: page * pageSize })
  }, [fetchNextPage])

  const hasResultsAvailable = !search.isLoading && !search.isPreviousData

  return (
    <BannerPage
      omitBackground
      className="search-page-banner"
      bannerContent={
        <Container>
          <GridContainer>
            <GridColumn variant="sidebar-2" />
            <GridColumn variant="main-2" component="section">
              <SearchInput
                className="main-search"
                placeholder="Search for online courses or programs at MIT"
                onChange={updateText}
                value={text || ""}
                onClear={clearText}
                onSubmit={onSubmit}
                autoFocus
              />
            </GridColumn>
          </GridContainer>
        </Container>
      }
    >
      <Container disableGutters>
        <GridContainer>
          <GridColumn variant="sidebar-2">
            <SearchFilterDrawer
              alwaysOpen={isMd}
              facetMap={facetMap}
              facetOptions={facetOptions}
              activeFacets={activeFacets}
              onUpdateFacets={onUpdateFacets}
              clearAllFilters={clearAllFilters}
              toggleFacet={toggleFacet}
            />
          </GridColumn>
          <GridColumn variant="main-2" component="section">
            <InfiniteScroll
              hasMore={search.hasNextPage}
              loadMore={loadMore}
              initialLoad={search.data === undefined}
              loader={
                <div key="loader" className="loader">
                  Loading ...
                </div>
              }
            >
              {search.isError ? (
                <div className="no-results-found">
                  <span>Oops! Something went wrong.</span>
                </div>
              ) : hasResultsAvailable ? (
                results.length === 0 ? (
                  <div className="no-results-found">
                    <span>No results found for your query</span>
                  </div>
                ) : (
                  <ul
                    aria-label="Search Results"
                    className="ic-searchpage-list ic-card-row-list"
                  >
                    {results.map(hit => (
                      <li
                        key={hit._source.object_type.concat(
                          hit._source.id.toString()
                        )}
                      >
                        <LearningResourceCard
                          variant="row-reverse"
                          resource={hit._source}
                        />
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <span>Loading...</span>
              )}
            </InfiniteScroll>
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default SearchPage
