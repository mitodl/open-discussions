/* global SETTINGS:false */
import React, { useState, useCallback } from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import { intersection } from "lodash"
import { BannerPage, useDeviceCategory, DESKTOP } from "ol-util"
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

import axios from "../libs/axios"

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

const search = async (params: SearchQueryParams) => {
  const body = buildSearchQuery(params)
  try {
    const { data } = await axios.post("search/", body)
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

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setCompletedInitialLoad(false)
    setTotal(0)
  }, [])

  const runSearch = useCallback(
    async (text: string, activeFacets: Facets, from: number) => {
      if (activeFacets["type"]) {
        activeFacets["type"] = intersection(activeFacets["type"], ALLOWED_TYPES)
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

  const deviceCategory = useDeviceCategory()

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
    pageSize
  )

  return (
    <BannerPage
      omitBackground
      className="search-page-banner"
      bannerContent={
        <Container>
          <Grid container>
            {deviceCategory === DESKTOP ? <Grid item xs={3}></Grid> : null}
            <Grid
              item
              xs={deviceCategory === DESKTOP ? 9 : 12}
              component="section"
            >
              <SearchInput
                className="main-search"
                classNameSubmit="search-icon-button"
                placeholder="Search for online courses or programs at MIT"
                onChange={updateText}
                value={text || ""}
                onClear={clearText}
                //@ts-expect-error - types need to be fixed in course-search-utils
                onSubmit={onSubmit}
                autoFocus
              />
            </Grid>
          </Grid>
        </Container>
      }
    >
      <Container disableGutters>
        <Grid container>
          <Grid item xs={deviceCategory === DESKTOP ? 3 : 12}>
            <SearchFilterDrawer
              facetMap={facetMap}
              facetOptions={facetOptions}
              activeFacets={activeFacets}
              //@ts-expect-error - types need to be fixed in course-search-utils
              onUpdateFacets={onUpdateFacets}
              clearAllFilters={clearAllFilters}
              toggleFacet={toggleFacet}
            />
          </Grid>
          <Grid
            item
            xs={deviceCategory === DESKTOP ? 8 : 12}
            component="section"
          >
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
          </Grid>
        </Grid>
      </Container>
      <LearningResourceDrawer
        drawerObject={drawerObject}
        setDrawerObject={setDrawerObject}
      />
    </BannerPage>
  )
}

export default SearchPage
