// @flow
/* global SETTINGS: false */
import R from "ramda"
import React, { useState, useEffect, useCallback } from "react"
import InfiniteScroll from "react-infinite-scroller"
import { useSelector, useDispatch } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import { useLocation, useHistory } from "react-router-dom"
import { createSelector } from "reselect"

import CanonicalLink from "../components/CanonicalLink"
import { Cell, Grid } from "../components/Grid"
import { Loading, CourseSearchLoading } from "../components/Loading"
import CourseSearchbox from "../components/CourseSearchbox"
import SearchResult from "../components/SearchResult"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import CourseFilterDrawer from "../components/search/CourseFilterDrawer"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import {
  LR_TYPE_ALL,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_USERLIST,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import {
  emptyOrNil,
  preventDefaultAndInvoke,
  GRID_MOBILE_BREAKPOINT,
  isDoubleQuoted
} from "../lib/util"
import {
  mergeFacetResults,
  SEARCH_GRID_UI,
  SEARCH_LIST_UI
} from "../lib/search"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import {
  deserializeSearchParams,
  serializeSearchParams
} from "../lib/course_search"
import { useResponsive, useWidth } from "../hooks/util"

import type { SortParam, LearningResourceResult } from "../flow/searchTypes"
import type { Match } from "react-router"
import type { CellWidth } from "../components/Grid"

export type CourseSearchParams = {
  type?: ?string | ?Array<string>,
  text?: ?string,
  from?: number,
  size?: number,
  channelName?: ?string,
  facets?: Map<string, Array<string>>,
  sort?: SortParam,
  activeFacets?: Object
}

const THREE_CARD_BREAKPOINT = 1100

const INITIAL_FACET_STATE = {
  audience:      [],
  certification: [],
  offered_by:    [],
  topics:        [],
  type:          []
}

const courseSearchSelector = createSelector(
  state => state.search,
  search => {
    const { error, results, total, facets, suggest } = search.data

    return {
      error,
      results,
      facets,
      suggest,
      total,
      loaded:     search.loaded,
      processing: search.processing
    }
  }
)

type ResultProps = {
  from: number,
  incremental: boolean,
  loadMore: Function,
  loaded: boolean,
  processing: boolean,
  results: Array<LearningResourceResult>,
  searchResultCellWidth: CellWidth,
  searchResultLayout: string,
  toggleFacet: Function,
  total: number
}

export function Results(props: ResultProps) {
  const {
    from,
    incremental,
    loadMore,
    loaded,
    processing,
    results,
    searchResultCellWidth,
    searchResultLayout,
    toggleFacet,
    total
  } = props

  if ((processing || !loaded) && !incremental) {
    return <CourseSearchLoading layout={searchResultLayout} />
  }

  if (total === 0 && !processing && loaded) {
    return (
      <div className="empty-list-msg">There are no results to display.</div>
    )
  }

  return (
    <InfiniteScroll
      hasMore={from + SETTINGS.search_page_size < total}
      loadMore={loadMore}
      initialLoad={from === 0}
      loader={<Loading className="infinite" key="loader" />}
    >
      <Grid>
        {results.map((result, i) => (
          <Cell width={searchResultCellWidth} key={i}>
            <SearchResult
              result={result}
              toggleFacet={toggleFacet}
              searchResultLayout={searchResultLayout}
            />
          </Cell>
        ))}
      </Grid>
    </InfiniteScroll>
  )
}

type Props = {
  match: Match
}

export default function CourseSearchPage(props: Props) {
  const { match } = props

  const {
    results,
    facets,
    suggest,
    total,
    loaded,
    processing,
    error
  } = useSelector(courseSearchSelector)

  const [incremental, setIncremental] = useState(false)
  const [searchResultLayout, setSearchResultLayout] = useState(SEARCH_LIST_UI)
  const [from, setFrom] = useState(0)
  const [text, setText] = useState("")
  const [activeFacets, setActiveFacets] = useState(INITIAL_FACET_STATE)

  const dispatch = useDispatch()

  const clearSearchCB = useCallback(
    () => {
      dispatch(actions.search.clear())
      dispatch(clearSearch())
    },
    [dispatch]
  )

  useResponsive()
  const location = useLocation()
  const history = useHistory()

  const facetOptions = useCallback(
    (group: string) => {
      const emptyFacet = { buckets: [] }
      const emptyActiveFacets = {
        buckets: (activeFacets[group] || []).map(facet => ({
          key:       facet,
          doc_count: 0
        }))
      }

      if (!facets) {
        return null
      }

      return mergeFacetResults(
        facets.get(group) || emptyFacet,
        emptyActiveFacets
      )
    },
    [facets, activeFacets]
  )

  const runSearch = useCallback(
    async (text, activeFacets, incremental = false) => {
      let nextFrom = from + SETTINGS.search_page_size

      if (!incremental) {
        clearSearchCB()
        nextFrom = 0
      }
      setFrom(nextFrom)
      setIncremental(incremental)

      const searchFacets = R.clone(activeFacets)

      if (emptyOrNil(searchFacets.type)) {
        searchFacets.type = LR_TYPE_ALL
      } else {
        if (searchFacets.type.includes(LR_TYPE_PODCAST)) {
          searchFacets.type.push(LR_TYPE_PODCAST_EPISODE)
        }

        if (searchFacets.type.includes(LR_TYPE_USERLIST)) {
          searchFacets.type.push(LR_TYPE_LEARNINGPATH)
        }
      }

      await dispatch(
        actions.search.post({
          channelName: null,
          text,
          type:        searchFacets.type,
          facets:      new Map(Object.entries(searchFacets)),
          from:        nextFrom,
          size:        SETTINGS.search_page_size
        })
      )

      // search is updated, now echo params to URL bar
      history.replace({
        pathname: location.pathname,
        search:   serializeSearchParams({
          text,
          activeFacets
        })
      })
    },
    [from, location, history, setFrom, setIncremental, clearSearchCB, dispatch]
  )

  const loadMore = useCallback(
    () => {
      if (!loaded) {
        // this function will be triggered repeatedly by <InfiniteScroll />, filter it to just once at a time
        return
      }

      runSearch(text, activeFacets, true)
    },
    [runSearch, loaded, text, activeFacets]
  )

  const clearAllFilters = useCallback(
    () => {
      setText(null)
      setActiveFacets(INITIAL_FACET_STATE)
    },
    [setText, setActiveFacets]
  )

  // this effect here basically listens to activeFacets for changes and re-runs
  // the search whenever it changes. we always want the facet changes to take
  // effect immediately, so we need to either do this or call runSearch from
  // our facet-related callbacks. this approach lets us avoid having the
  // facet-related callbacks (toggleFacet, etc) be dependent on then value of
  // the runSearch function, which leads to too much needless churn in the
  // facet callbacks and then causes excessive re-rendering of the facet UI
  useEffect(
    () => {
      runSearch(text, activeFacets)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFacets]
  )

  const toggleFacet = useCallback(
    async (name: string, value: string, isEnabled: boolean) => {
      const newFacets = R.clone(activeFacets)

      if (isEnabled) {
        newFacets[name] = _.union(newFacets[name] || [], [value])
      } else {
        newFacets[name] = _.without(newFacets[name] || [], value)
      }
      setActiveFacets(newFacets)
    },
    [activeFacets, setActiveFacets]
  )

  const onUpdateFacets = useCallback(
    (e: Object) => {
      toggleFacet(e.target.name, e.target.value, e.target.checked)
    },
    [toggleFacet]
  )

  const updateText = useCallback(
    (event: Object) => {
      const text = event ? event.target.value : ""
      setText(text)
    },
    [setText]
  )

  const clearText = useCallback(
    (event: Object) => {
      event.preventDefault()
      setText("")
      runSearch("", activeFacets)
    },
    [activeFacets, setText, runSearch]
  )

  const acceptSuggestion = useCallback(
    (suggestion: string) => {
      setText(suggestion)
      runSearch(suggestion, activeFacets)
    },
    [setText, activeFacets, runSearch]
  )

  const deviceWidth = useWidth()
  const [searchResultCellWidth, setSearchResultCellWidth] = useState(6)

  useEffect(
    () => {
      if (searchResultLayout === SEARCH_LIST_UI) {
        setSearchResultCellWidth(12)
      } else if (
        deviceWidth < THREE_CARD_BREAKPOINT &&
        deviceWidth >= GRID_MOBILE_BREAKPOINT
      ) {
        setSearchResultCellWidth(6)
      } else {
        setSearchResultCellWidth(4)
      }
    },
    [setSearchResultCellWidth, deviceWidth, searchResultLayout]
  )

  // this is our 'on startup' useEffect call
  useEffect(() => {
    clearSearchCB()
    const { text, activeFacets } = deserializeSearchParams(location)
    setText(text)
    setActiveFacets(activeFacets)
    runSearch(text, activeFacets)
    // dependencies intentionally left blank here, because this effect
    // needs to run only once - it's just to initialize the search state
    // based on the value of the URL (if any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = useCallback(
    e => {
      e.preventDefault()
      runSearch(text, activeFacets)
    },
    [runSearch, text, activeFacets]
  )

  const facetColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 3 : 4
  const resultsColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 9 : 8
  const suggestions =
    !emptyOrNil(suggest) && !emptyOrNil(text)
      ? R.without([text], suggest).map(
        suggestion => (isDoubleQuoted(text) ? `"${suggestion}"` : suggestion)
      )
      : []

  return (
    <BannerPageWrapper>
      <MetaTags>
        <CanonicalLink match={match} />
      </MetaTags>
      <BannerPageHeader tall compactOnMobile>
        <BannerContainer tall compactOnMobile>
          <BannerImage src={COURSE_SEARCH_BANNER_URL} tall compactOnMobile />
        </BannerContainer>
        <CourseSearchbox
          onChange={updateText}
          value={text || ""}
          onClear={clearText}
          onSubmit={onSubmit}
          validation={error}
          autoFocus
        />
      </BannerPageHeader>
      <Grid
        className={`main-content ${
          searchResultLayout === SEARCH_GRID_UI
            ? "two-column-extrawide"
            : "two-column"
        } search-page`}
      >
        <Cell width={facetColumnWidth} />
        <Cell width={resultsColumnWidth}>
          {!emptyOrNil(suggestions) ? (
            <div className="suggestion">
              Did you mean
              {suggestions.map((suggestion, i) => (
                <span key={i}>
                  <a
                    onClick={preventDefaultAndInvoke(() =>
                      acceptSuggestion(suggestion)
                    )}
                    onKeyPress={e => {
                      if (e.key === "Enter") {
                        acceptSuggestion(suggestion)
                      }
                    }}
                    tabIndex="0"
                  >
                    {` ${suggestion}`}
                  </a>
                  {i < suggestions.length - 1 ? " | " : ""}
                </span>
              ))}
            </div>
          ) : null}
          <div className="layout-buttons">
            <div
              onClick={() => setSearchResultLayout(SEARCH_LIST_UI)}
              onKeyPress={e => {
                if (e.key === "Enter") {
                  setSearchResultLayout(SEARCH_LIST_UI)
                }
              }}
              tabIndex="0"
              className={`option ${
                searchResultLayout === SEARCH_LIST_UI ? "active" : ""
              }`}
            >
              <i className="material-icons view_list">view_list</i>
            </div>
            <div
              onClick={() => setSearchResultLayout(SEARCH_GRID_UI)}
              onKeyPress={e => {
                if (e.key === "Enter") {
                  setSearchResultLayout(SEARCH_GRID_UI)
                }
              }}
              tabIndex="0"
              className={`option ${
                searchResultLayout === SEARCH_GRID_UI ? "active" : ""
              }`}
            >
              <i className="material-icons view_comfy">view_comfy</i>
            </div>
            {processing ? null : (
              <div className="results-count">
                {total} {total === 1 ? "Result" : "Results"}
              </div>
            )}
          </div>
        </Cell>
        <Cell className="search-filters" width={facetColumnWidth}>
          <CourseFilterDrawer
            activeFacets={activeFacets}
            clearAllFilters={clearAllFilters}
            toggleFacet={toggleFacet}
            facetOptions={facetOptions}
            onUpdateFacets={onUpdateFacets}
          />
        </Cell>
        <Cell width={resultsColumnWidth}>
          {error ? null : (
            <Results
              from={from}
              incremental={incremental}
              loadMore={loadMore}
              loaded={loaded}
              processing={processing}
              results={results}
              searchResultCellWidth={searchResultCellWidth}
              searchResultLayout={searchResultLayout}
              toggleFacet={toggleFacet}
              total={total}
            />
          )}
        </Cell>
      </Grid>
    </BannerPageWrapper>
  )
}
