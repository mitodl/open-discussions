// @flow
/* global SETTINGS: false */
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import { compose } from "redux"
import debounce from "lodash/debounce"

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
import CourseFilterDrawer from "../components/CourseFilterDrawer"
import AudioPlayer from "../components/AudioPlayer"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import {
  LR_TYPE_ALL,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_VIDEO,
  LR_TYPE_PODCAST,
  LR_TYPE_PODCAST_EPISODE
} from "../lib/constants"
import {
  emptyOrNil,
  preventDefaultAndInvoke,
  getViewportWidth,
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

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  SearchInputs,
  SearchParams,
  SortParam,
  Result,
  FacetResult,
  CurrentFacet,
  LearningResourceResult
} from "../flow/searchTypes"

type OwnProps = {|
  dispatch: Dispatch<any>,
  location: Location,
  history: Object,
  isModerator: boolean,
  match: Match,
  runSearch: (params: SearchParams) => Promise<*>,
  clearSearch: () => void
|}

type StateProps = {|
  initialLoad: boolean,
  results: Array<Result>,
  facets: Map<string, FacetResult>,
  suggest: Array<string>,
  loaded: boolean,
  processing: boolean,
  total: number,
  entities: Object
|}

type DispatchProps = {|
  runSearch: (params: SearchParams) => Promise<*>,
  clearSearch: () => Promise<*>,
  dispatch: Dispatch<*>
|}

type Props = {|
  ...OwnProps,
  ...StateProps,
  ...DispatchProps
|}

type State = {
  from: number,
  error: ?string,
  currentFacetGroup: ?CurrentFacet,
  incremental: boolean,
  searchResultLayout: string
}

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
const shouldRunSearch = R.complement(R.eqProps("activeFacets"))

const THREE_CARD_BREAKPOINT = 1100

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      incremental:        false,
      searchResultLayout: SEARCH_LIST_UI,
      from:               0,
      currentFacetGroup:  null,
      error:              null
    }
  }

  componentDidMount() {
    const { clearSearch } = this.props
    clearSearch()
    this.runSearch()
    window.addEventListener("resize", () => this.setState({}))
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    if (shouldRunSearch(prevState, this.state)) {
      this.debouncedRunSearch()
    }
  }

  clearAllFilters = async () => {
    this.updateSearchState({
      text:         null,
      activeFacets: {
        offered_by:   [],
        availability: [],
        topics:       [],
        cost:         [],
        type:         []
      }
    })
    this.setState({
      currentFacetGroup: null
    })
  }

  mergeFacetOptions = (group: string) => {
    const { facets, location } = this.props
    const { currentFacetGroup } = this.state
    const { activeFacets } = deserializeSearchParams(location)
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

    if (currentFacetGroup && currentFacetGroup.group === group) {
      return mergeFacetResults(
        currentFacetGroup.result,
        emptyActiveFacets,
        facets.get(group) || emptyFacet
      )
    } else {
      return mergeFacetResults(
        facets.get(group) || emptyFacet,
        emptyActiveFacets
      )
    }
  }

  loadMore = async () => {
    const { loaded } = this.props

    if (!loaded) {
      // this function will be triggered repeatedly by <InfiniteScroll />, filter it to just once at a time
      return
    }

    await this.runSearch({
      incremental: true
    })
  }

  updateSearchState = (
    searchParams: CourseSearchParams,
    debounce: boolean = false
  ) => {
    const { location, history } = this.props
    const { pathname } = location
    const { activeFacets } = searchParams

    const oldParams = deserializeSearchParams(location)

    const text = searchParams.hasOwnProperty("text")
      ? searchParams.text
      : oldParams.text

    history.replace({
      pathname: pathname,
      search:   serializeSearchParams({
        text,
        activeFacets: activeFacets || oldParams.activeFacets
      })
    })
    if (debounce) {
      this.debouncedRunSearch()
    } else {
      // this ensures that the `history.replace` update is in place before
      // we try to pull out the data in `this.runSearch`
      setTimeout(() => {
        this.runSearch()
      })
    }
  }

  runSearch = async (params: SearchInputs = { incremental: false }) => {
    const { clearSearch, runSearch, location } = this.props
    const { activeFacets, text } = deserializeSearchParams(location)

    let from = this.state.from + SETTINGS.search_page_size
    const { incremental } = params
    if (!incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from, incremental })

    if (emptyOrNil(activeFacets.type)) {
      activeFacets.type = LR_TYPE_ALL
    } else if (activeFacets.type.includes(LR_TYPE_PODCAST)) {
      activeFacets.type.push(LR_TYPE_PODCAST_EPISODE)
    }

    await runSearch({
      channelName: null,
      text,
      type:        activeFacets.type,
      // $FlowFixMe: type facet wont be undefined here
      facets:      new Map(Object.entries(activeFacets)),
      from,
      size:        SETTINGS.search_page_size
    })
  }

  debouncedRunSearch = debounce(this.runSearch, 500)

  setSearchUI = (searchResultLayout: string) => {
    this.setState({
      searchResultLayout
    })
  }

  toggleFacet = async (name: string, value: string, isEnabled: boolean) => {
    const { location } = this.props
    const { currentFacetGroup } = this.state
    const { activeFacets } = deserializeSearchParams(location)
    const { facets } = this.props

    if (isEnabled) {
      activeFacets[name] = _.union(activeFacets[name] || [], [value])
    } else {
      activeFacets[name] = _.without(activeFacets[name] || [], value)
    }

    const facetsGroup = facets.get(name) || { buckets: [] }

    await this.setState({
      currentFacetGroup: {
        group:  name,
        result:
          currentFacetGroup && currentFacetGroup.group === name
            ? mergeFacetResults(currentFacetGroup.result, facetsGroup)
            : facetsGroup
      }
    })

    this.updateSearchState({
      activeFacets
    })
  }

  onUpdateFacets = (e: Object) => {
    this.toggleFacet(e.target.name, e.target.value, e.target.checked)
  }

  updateText = async (event: Object) => {
    const text = event ? event.target.value : ""
    await this.setState({ currentFacetGroup: null })
    await this.updateSearchState({ text }, true)
  }

  useSuggestion = async (text: string) => {
    await this.setState({ currentFacetGroup: null })
    await this.updateSearchState({ text })
    this.runSearch()
  }

  getFavoriteOrListedObject = (result: LearningResourceResult) => {
    // Get the latest data from state if any to reflect recent changes in favorites/lists
    const { entities } = this.props
    const {
      courses,
      programs,
      userLists,
      videos,
      podcasts,
      podcastEpisodes
    } = entities
    switch (result.object_type) {
    case LR_TYPE_COURSE:
      return courses ? courses[result.id] || null : null
    case LR_TYPE_PROGRAM:
      return programs ? programs[result.id] || null : null
    case LR_TYPE_USERLIST:
      return userLists ? userLists[result.id] || null : null
    case LR_TYPE_VIDEO:
      return videos ? videos[result.id] || null : null
    case LR_TYPE_PODCAST:
      return podcasts ? podcasts[result.id] || null : null
    case LR_TYPE_PODCAST_EPISODE:
      return podcastEpisodes ? podcastEpisodes[result.id] || null : null
    case LR_TYPE_LEARNINGPATH:
      return userLists ? userLists[result.id] || null : null
    }
  }

  getSearchResultCellWidth = () => {
    const { searchResultLayout } = this.state

    if (searchResultLayout === SEARCH_LIST_UI) {
      return 12
    }

    const width = getViewportWidth()
    if (width < THREE_CARD_BREAKPOINT && width >= GRID_MOBILE_BREAKPOINT) {
      return 6
    } else {
      return 4
    }
  }

  renderResults = () => {
    const { location, results, processing, loaded, total } = this.props
    const { from, incremental, searchResultLayout } = this.state
    const { activeFacets } = deserializeSearchParams(location)

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
        loadMore={this.loadMore}
        initialLoad={from === 0}
        loader={<Loading className="infinite" key="loader" />}
      >
        <Grid>
          {results.map((result, i) => (
            <Cell width={this.getSearchResultCellWidth()} key={i}>
              <SearchResult
                result={result}
                overrideObject={
                  // $FlowFixMe
                  this.getFavoriteOrListedObject(result)
                }
                toggleFacet={this.toggleFacet}
                availabilities={activeFacets["availability"]}
                searchResultLayout={searchResultLayout}
              />
            </Cell>
          ))}
        </Grid>
      </InfiniteScroll>
    )
  }

  render() {
    const { location, match, total, processing, suggest } = this.props
    const { error, searchResultLayout } = this.state
    const { text, activeFacets } = deserializeSearchParams(location)

    const facetColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 3 : 4
    const resultsColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 9 : 8
    const suggestions =
      !emptyOrNil(suggest) && !emptyOrNil(text)
        ? R.without([text], suggest).map(
          suggestion =>
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
          <CourseSearchbox
            onChange={this.updateText}
            value={text || ""}
            onClear={this.updateText}
            onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
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
                        this.useSuggestion(suggestion)
                      )}
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
                onClick={() => this.setSearchUI(SEARCH_LIST_UI)}
                className={`option ${
                  searchResultLayout === SEARCH_LIST_UI ? "active" : ""
                }`}
              >
                <i className="material-icons view_list">view_list</i>
              </div>
              <div
                onClick={() => this.setSearchUI(SEARCH_GRID_UI)}
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
              clearAllFilters={this.clearAllFilters}
              toggleFacet={this.toggleFacet}
              mergeFacetOptions={this.mergeFacetOptions}
              onUpdateFacets={this.onUpdateFacets}
            />
          </Cell>
          <Cell width={resultsColumnWidth}>
            {error ? null : this.renderResults()}
          </Cell>
        </Grid>
        <AudioPlayer />
      </BannerPageWrapper>
    )
  }
}

const mapStateToProps = (state): StateProps => {
  const { search, entities } = state
  const { results, total, initialLoad, facets, suggest } = search.data

  return {
    results,
    facets,
    suggest,
    total,
    initialLoad,
    loaded:     search.loaded,
    processing: search.processing,
    entities
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  runSearch: async (params: SearchParams) => {
    return await dispatch(actions.search.post(params))
  },
  clearSearch: async () => {
    dispatch(actions.search.clear())
    await dispatch(clearSearch())
  },
  dispatch
})

export default compose(
  connect<Props, OwnProps, _, _, _, _>(
    mapStateToProps,
    mapDispatchToProps
  )
)(CourseSearchPage)
