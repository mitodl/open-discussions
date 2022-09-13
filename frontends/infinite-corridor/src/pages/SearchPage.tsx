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
  Facets
} from "@mitodl/course-search-utils"
import {
  LearningResourceResult,
  LearningResourceCard,
  LearningResourceCardProps,
  SearchInput,
  SearchFilterDrawer,
  FacetManifest,
  LearningResourceDrawer,
  useGetResourceIdentifiersFromUrl,
  ResourceIdentifiers
} from "ol-search-ui"
import { GridColumn, GridContainer } from "../components/layout"

import axios from "../libs/axios"
import { useHistory } from "react-router"

const ALLOWED_TYPES = ["program", "course"]
const pageSize = SETTINGS.search_page_size

const facetMap: FacetManifest = [
  ["certification", "Certificates"],
  ["type", "Learning Resource"],
  ["offered_by", "Offered By"]
]

interface Result {
  _source: LearningResourceResult
}

const imgConfig: LearningResourceCardProps["imgConfig"] = {
  ocwBaseUrl: SETTINGS.ocw_next_base_url,
  embedlyKey: SETTINGS.embedlyKey,
  width:      170,
  height:     130
}

const SEARCH_API_URL = "search/"

const search = async (params: SearchQueryParams) => {
  const body = buildSearchQuery(params)
  try {
    const { data } = await axios.post(SEARCH_API_URL, body)
    return data
  } catch (err) {
    return null
  }
}

const SearchPage: React.FC = () => {
  const [results, setSearchResults] = useState<Result[]>([])
  const [total, setTotal] = useState(0)
  const [completedInitialLoad, setCompletedInitialLoad] = useState(false)
  const [requestInFlight, setRequestInFlight] = useState(false)
  const [searchApiFailed, setSearchApiFailed] = useState(false)
  const [aggregations, setAggregations] = useState<Aggregations>(new Map())
  const [drawerObject, setDrawerObject] = useState<ResourceIdentifiers | null>(
    useGetResourceIdentifiersFromUrl() as ResourceIdentifiers
  )
  const isMd = useMuiBreakpoint("md")

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setCompletedInitialLoad(false)
    setTotal(0)
  }, [])

  const runSearch = useCallback(
    async (text: string, activeFacets: Facets, from: number) => {
      if (activeFacets["type"]) {
        activeFacets["type"] = intersection(ALLOWED_TYPES, activeFacets["type"])
      } else {
        activeFacets["type"] = ALLOWED_TYPES
      }
      setRequestInFlight(true)
      const newResults = await search({
        text,
        from,
        activeFacets,
        size: pageSize
      })
      setRequestInFlight(false)

      if (!newResults || newResults["apiFailed"]) {
        setSearchApiFailed(true)
        return
      }

      setAggregations(new Map(Object.entries(newResults.aggregations ?? {})))

      setSearchResults(results =>
        from === 0 ?
          newResults.hits.hits :
          [...results, ...newResults.hits.hits]
      )
      setTotal(newResults.hits.total)
      setCompletedInitialLoad(true)
    },
    []
  )

  const history = useHistory()
  const {
    updateText,
    loadMore,
    text,
    onSubmit,
    from,
    clearText,
    facetOptions,
    onUpdateFacets,
    clearAllFilters,
    toggleFacet,
    activeFacets
  } = useCourseSearch(
    runSearch,
    clearSearch,
    aggregations,
    // this is the 'loaded' value, which is what useCourseSearch uses
    // to determine whether to fire off a request or not.
    completedInitialLoad && !requestInFlight,
    pageSize,
    history
  )

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
                classNameSubmit="search-icon-button"
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
              hasMore={from + pageSize < total}
              loadMore={loadMore}
              initialLoad={from === 0}
              loader={
                <div key="loader" className="loader">
                  Loading ...
                </div>
              }
            >
              {searchApiFailed ? (
                <div className="no-results-found">
                  <span>Oops! Something went wrong.</span>
                </div>
              ) : completedInitialLoad ? (
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
                          className="ic-resource-card"
                          variant="row-reverse"
                          imgConfig={imgConfig}
                          resource={hit._source}
                          toggleDrawer={setDrawerObject}
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
      <LearningResourceDrawer
        drawerObject={drawerObject}
        setDrawerObject={setDrawerObject}
      />
    </BannerPage>
  )
}

export default SearchPage
