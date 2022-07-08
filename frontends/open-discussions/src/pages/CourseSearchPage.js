// @flow
/* global SETTINGS: false */
import R from "ramda"
import React, { useState, useEffect, useCallback } from "react"
import InfiniteScroll from "react-infinite-scroller"
import { useSelector, useDispatch } from "react-redux"
import { MetaTags } from "react-meta-tags"
import { createSelector } from "reselect"
import { useCourseSearch } from "@mitodl/course-search-utils"

import { CanonicalLink } from "ol-util"
import { Searchbox } from "ol-search-ui"
import { Cell, Grid } from "../components/Grid"
import { Loading, CourseSearchLoading } from "../components/Loading"

import SearchResult from "../components/SearchResult"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "ol-util"
import CourseFilterDrawer from "../components/search/CourseFilterDrawer"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import {
  emptyOrNil,
  preventDefaultAndInvoke,
  GRID_MOBILE_BREAKPOINT,
  isDoubleQuoted
} from "../lib/util"
import { SEARCH_GRID_UI, SEARCH_LIST_UI } from "../lib/search"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
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

  const { results, facets, suggest, total, loaded, processing, error } =
    useSelector(courseSearchSelector)

  const [searchResultLayout, setSearchResultLayout] = useState(SEARCH_LIST_UI)

  const dispatch = useDispatch()

  const clearSearchCB = useCallback(() => {
    dispatch(actions.search.clear())
    dispatch(clearSearch())
  }, [dispatch])

  useResponsive()

  const runSearch = useCallback(
    async (text, searchFacets, from) => {
      await dispatch(
        actions.search.post({
          channelName: null,
          text,
          type:        searchFacets.type,
          facets:      new Map(Object.entries(searchFacets)),
          from,
          size:        SETTINGS.search_page_size
        })
      )
    },
    [dispatch]
  )

  const {
    facetOptions,
    clearAllFilters,
    toggleFacet,
    onUpdateFacets,
    updateText,
    clearText,
    acceptSuggestion,
    loadMore,
    incremental,
    text,
    activeFacets,
    from,
    onSubmit
  } = useCourseSearch(
    runSearch,
    clearSearchCB,
    facets,
    loaded,
    SETTINGS.search_page_size
  )

  const deviceWidth = useWidth()
  const [searchResultCellWidth, setSearchResultCellWidth] = useState(6)

  useEffect(() => {
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
  }, [setSearchResultCellWidth, deviceWidth, searchResultLayout])

  const facetColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 3 : 4
  const resultsColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 9 : 8
  const suggestions =
    !emptyOrNil(suggest) && !emptyOrNil(text)
      ? R.without(
        [
          text
            .toLowerCase()
            .trim()
            .replace(/^"(.*)"$/, "$1")
            .replace(/[\W]+/g, " ")
            .trim()
        ],
        suggest
      ).map(suggestion =>
        isDoubleQuoted(text) ? `"${suggestion}"` : suggestion
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
        <Searchbox
          className="course-searchbox"
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
