/* global SETTINGS:false */
import React, { useState, useCallback } from "react"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid"
import { intersection } from "ramda"
import { BannerPage } from "ol-util"
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
  Searchbox
} from "ol-search-ui"

import axios from "../libs/axios"

const ALLOWED_TYPES = ["program", "course"]
const pageSize = SETTINGS.search_page_size

const lipsum =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum"

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

  const { updateText, loadMore, text, onSubmit, from, clearText } =
    useCourseSearch(
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
      bannerContent={
        <Searchbox
          className="course-searchbox"
          placeholder="Search for online courses or programs at MIT"
          onChange={updateText}
          value={text || ""}
          onClear={clearText}
          //@ts-expect-error - types need to be fixed in course-search-utils
          onSubmit={onSubmit}
          autoFocus
        />
      }
    >
      <Container disableGutters>
        <Grid container>
          <Grid item xs={3}>
            <h3>Facets!!!</h3>
            {lipsum}
          </Grid>
          <Grid item xs={9} component="section">
            <InfiniteScroll
              className="ic-searchpage-list"
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
                  <span aria-label="Search Results">
                    {results.map(hit => (
                      <LearningResourceCard
                        key={hit._source.object_type.concat(
                          hit._source.id.toString()
                        )}
                        className="ic-resource-card"
                        variant="row-reverse"
                        imgConfig={imgConfig}
                        resource={hit._source}
                      />
                    ))}
                  </span>
                )
              ) : (
                <span>Loading...</span>
              )}
            </InfiniteScroll>
          </Grid>
        </Grid>
      </Container>
    </BannerPage>
  )
}

export default SearchPage
