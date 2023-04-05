/* global SETTINGS:false */
import React, { useState, useCallback } from "react"
import Container from "@mui/material/Container"
import { intersection } from "lodash"
import { BannerPage, useMuiBreakpoint } from "ol-util"
import InfiniteScroll from "react-infinite-scroller"
import {
  useCourseSearch,
  buildSearchQuery,
  Aggregations,
  SearchQueryParams,
  Facets,
  useSearchInputs
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
  if (params.activeFacets?.["type"]) {
    params.activeFacets["type"] = intersection(params.activeFacets["type"], ALLOWED_TYPES)
  } else {
    params.activeFacets = {
      ...params.activeFacets,
      type: ALLOWED_TYPES
    }
  }
  return useInfiniteQuery({
    queryKey:         ["search", params],
    queryFn:          ({ pageParam = 0 }) => doSearch({ ...params, from: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      console.log("getNextPageParam")
      console.log(lastPage)
      console.log(pages)
      return pages.length * pageSize
    }
  })
}

const SearchPage: React.FC = () => {
  const [aggregations, setAggregations] = useState<Aggregations>(new Map())
  const isMd = useMuiBreakpoint("md")
  const [searchText, setSearchText] = useState("")

  const history = useHistory()
  const {
    updateText,
    text,
    facetOptions,
    onUpdateFacets,
    clearAllFilters,
    toggleFacet,
    activeFacets,
    setText,
  } = useSearchInputs(
    history,
    aggregations
  )

  const search = useInfiniteSearch({
    text: searchText,
    activeFacets
  })

  const clearText = useCallback(() => {
    setText("")
    setSearchText("")
  }, [setText])
  const onSubmit = () => {
    setSearchText(text)
  }
  const total = search.data?.pages[0].hits.total || 0
  const retrieved = search.data?.pages.reduce((acc, page) => acc + page.hits.hits.length, 0) || 0

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
              hasMore={retrieved < total}
              loadMore={page => search.fetchNextPage({pageParam: page })}
              initialLoad={search.data === undefined}
              loader={
                <div key="loader" className="loader">
                  Loading ...
                </div>
              }
            >
              {search.data?.pages.flatMap((page, index) => {
                return page.hits.hits.map(result => {
                  return <div key={result.id}>{JSON.stringify(result)}</div>
                })
              })}
            </InfiniteScroll>
          </GridColumn>
        </GridContainer>
      </Container>
    </BannerPage>
  )
}

export default SearchPage
