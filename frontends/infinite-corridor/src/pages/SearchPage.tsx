/* global SETTINGS:false */
import React, { useState, useCallback } from "react"
import { intersection } from "ramda"
import { BannerPageWrapper, BannerPageHeader, Cell } from "ol-util"
import { Searchbox, searchResultToLearningResource } from "ol-search-ui"
import InfiniteScroll from "react-infinite-scroller"
import {
  useCourseSearch,
  buildSearchQuery,
  Aggregations,
  SearchQueryParams,
  Facets
} from "@mitodl/course-search-utils"
import axios from "../libs/axios"
import { LearningResourceCard } from "../components/LearningResourceCard"
import { LearningResourceResult } from "ol-search-ui"
const ALLOWED_TYPES = ["program", "course"]
const pageSize = SETTINGS.search_page_size
const SEARCH_RESUTLT_CELL_WIDTH = 12

interface Result {
  _source: LearningResourceResult
}

const search = async (params: SearchQueryParams) => {
  const body = buildSearchQuery(params)

  try {
    const { data } = await axios.post("/search", body)
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
    <div>
      <BannerPageWrapper>
        <BannerPageHeader tall compactOnMobile>
          <Searchbox
            className="course-searchbox"
            onChange={updateText}
            value={text || ""}
            onClear={clearText}
            //@ts-expect-error - types need to be fixed in course-search-utils
            onSubmit={onSubmit}
            autoFocus
          />
        </BannerPageHeader>
      </BannerPageWrapper>
      <InfiniteScroll
        hasMore={from + pageSize < total}
        loadMore={loadMore}
        initialLoad={from === 0}
        loader={
          <div key="loading" className="loader">
            Loading ...
          </div>
        }
      >
        <section aria-label="Search Results">
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
              results.map((hit, idx) => (
                <Cell key={idx} width={SEARCH_RESUTLT_CELL_WIDTH}>
                  <LearningResourceCard
                    object={searchResultToLearningResource(hit._source)}
                  />
                </Cell>
              ))
            )
          ) : (
            <span>Loading...</span>
          )}
        </section>
      </InfiniteScroll>
    </div>
  )
}

export default SearchPage
