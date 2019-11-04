// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import { connectRequest } from "redux-query-react"
import { compose } from "redux"
import debounce from "lodash/debounce"

import LearningResourceDrawer from "../components/LearningResourceDrawer"
import CanonicalLink from "../components/CanonicalLink"
import { Cell, Grid } from "../components/Grid"
import { Loading, CourseSearchLoading } from "../components/Loading"
import AddToListDialog from "../components/AddToListDialog"
import SearchFacet from "../components/SearchFacet"
import SearchFilter from "../components/SearchFilter"
import CourseSearchbox from "../components/CourseSearchbox"
import SearchResult from "../components/SearchResult"
import {
  BannerPageWrapper,
  BannerPageHeader,
  BannerContainer,
  BannerImage
} from "../components/PageBanner"
import CourseFilterDrawer from "../components/CourseFilterDrawer"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import {
  availabilityFacetLabel,
  resourceLabel
} from "../lib/learning_resources"
import {
  LR_TYPE_ALL,
  LR_TYPE_BOOTCAMP,
  LR_TYPE_COURSE,
  LR_TYPE_PROGRAM,
  LR_TYPE_USERLIST,
  LR_TYPE_LEARNINGPATH,
  LR_TYPE_VIDEO
} from "../lib/constants"
import {
  emptyOrNil,
  preventDefaultAndInvoke,
  toArray,
  capitalize,
  getViewportWidth,
  GRID_MOBILE_BREAKPOINT
} from "../lib/util"
import {
  mergeFacetResults,
  SEARCH_GRID_UI,
  SEARCH_LIST_UI
} from "../lib/search"
import { COURSE_SEARCH_BANNER_URL } from "../lib/url"
import {
  favoritesRequest,
  favoritesSelector
} from "../lib/queries/learning_resources"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  SearchInputs,
  SearchParams,
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
  loaded: boolean,
  processing: boolean,
  total: number,
  favorites: Object
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
  text: ?string,
  activeFacets: Map<string, Array<string>>,
  from: number,
  error: ?string,
  currentFacetGroup: ?CurrentFacet,
  incremental: boolean,
  searchResultLayout: string
}

const facetDisplayMap = [
  ["type", "Learning Resource", resourceLabel],
  ["topics", "Subject Area", null],
  ["availability", "Availability", availabilityFacetLabel],
  ["cost", "Cost", capitalize],
  ["offered_by", "Offered By", null]
]

const shouldRunSearch = R.complement(R.eqProps("activeFacets"))

const THREE_CARD_BREAKPOINT = 1100

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:         qs.parse(props.location.search).q,
      activeFacets: new Map([
        ["type", _.union(toArray(qs.parse(props.location.search).type) || [])],
        [
          "offered_by",
          _.union(toArray(qs.parse(props.location.search).o) || [])
        ],
        ["topics", _.union(toArray(qs.parse(props.location.search).t) || [])],
        ["cost", _.union(toArray(qs.parse(props.location.search).c) || [])],
        [
          "availability",
          _.union(toArray(qs.parse(props.location.search).a) || [])
        ]
      ]),
      from:               0,
      error:              null,
      currentFacetGroup:  null,
      incremental:        false,
      searchResultLayout: SEARCH_LIST_UI
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
    this.setState({
      text:         null,
      activeFacets: new Map([
        ["offered_by", []],
        ["availability", []],
        ["topics", []],
        ["cost", []],
        ["type", []]
      ]),
      currentFacetGroup: null
    })
  }

  mergeFacetOptions = (group: string) => {
    const { facets } = this.props
    const { activeFacets, currentFacetGroup } = this.state
    const emptyFacet = { buckets: [] }
    const emptyActiveFacets = {
      buckets: (activeFacets.get(group) || []).map(facet => ({
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

  runSearch = async (params: SearchInputs = { incremental: false }) => {
    const {
      clearSearch,
      history,
      location: { pathname, search },
      runSearch
    } = this.props

    const { activeFacets, text } = this.state

    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q:    text,
        type: activeFacets.get("type"),
        o:    activeFacets.get("offered_by"),
        t:    activeFacets.get("topics"),
        a:    activeFacets.get("availability"),
        c:    activeFacets.get("cost")
      })
    })
    let from = this.state.from + SETTINGS.search_page_size

    const { incremental } = params
    if (!incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from, incremental })

    // clone the facts so we can search a default of searching all resources if type isn't specified
    const queryFacets = new Map(activeFacets)
    const type = queryFacets.get("type")
    queryFacets.set("type", emptyOrNil(type) ? LR_TYPE_ALL : type)
    await runSearch({
      channelName: null,
      text,
      type:        queryFacets.get("type"),
      // $FlowFixMe: type facet wont be undefined here
      facets:      queryFacets,
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
    const { activeFacets, currentFacetGroup } = this.state
    const { facets } = this.props
    const updatedFacets = new Map(activeFacets)
    const facetsGroup = facets.get(name) || { buckets: [] }
    if (isEnabled) {
      updatedFacets.set(name, _.union(activeFacets.get(name) || [], [value]))
    } else {
      updatedFacets.set(name, _.without(activeFacets.get(name) || [], value))
    }
    // $FlowFixMe: nothing undefined here
    this.setState({
      activeFacets:      updatedFacets,
      currentFacetGroup: {
        group:  name,
        result:
          currentFacetGroup && currentFacetGroup.group === name
            ? mergeFacetResults(currentFacetGroup.result, facetsGroup)
            : facetsGroup
      }
    })
  }

  onUpdateFacets = (e: Object) => {
    this.toggleFacet(e.target.name, e.target.value, e.target.checked)
  }

  updateText = async (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    await this.setState({ text, currentFacetGroup: null })
    if (!text) {
      this.runSearch()
    }
  }

  getFavoriteObject = (result: LearningResourceResult) => {
    const { favorites } = this.props
    const { bootcamps, courses, programs, userLists, videos } = favorites
    switch (result.object_type) {
    case LR_TYPE_COURSE:
      return courses[result.id]
    case LR_TYPE_BOOTCAMP:
      return bootcamps[result.id]
    case LR_TYPE_PROGRAM:
      return programs[result.id]
    case LR_TYPE_USERLIST:
      return userLists[result.id]
    case LR_TYPE_VIDEO:
      return videos[result.id]
    case LR_TYPE_LEARNINGPATH:
      return userLists[result.id]
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
    const { results, processing, loaded, total } = this.props
    const { from, incremental, searchResultLayout, activeFacets } = this.state

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
                  this.getFavoriteObject(result)
                }
                toggleFacet={this.toggleFacet}
                availabilities={activeFacets.get("availability")}
                searchResultLayout={searchResultLayout}
              />
            </Cell>
          ))}
        </Grid>
      </InfiniteScroll>
    )
  }

  render() {
    const { match, total, processing } = this.props
    const { text, error, activeFacets, searchResultLayout } = this.state

    const anyFiltersActive =
      _.flatten(_.toArray(activeFacets.values())).length > 0

    const facetColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 3 : 4
    const resultsColumnWidth = searchResultLayout === SEARCH_GRID_UI ? 9 : 8

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
            <CourseFilterDrawer>
              <div className="active-search-filters">
                {anyFiltersActive ? (
                  <div className="filter-section-title">
                    Filters
                    <span
                      className="clear-all-filters"
                      onClick={this.clearAllFilters}
                    >
                      Clear All
                    </span>
                  </div>
                ) : null}
                {facetDisplayMap.map(([name, title, labelFunction]) =>
                  (activeFacets.get(name) || []).map((facet, i) => (
                    <SearchFilter
                      key={i}
                      title={title}
                      value={facet}
                      clearFacet={() => this.toggleFacet(name, facet, false)}
                      labelFunction={labelFunction}
                    />
                  ))
                )}
              </div>
              {facetDisplayMap.map(([name, title, labelFunction], i) => (
                <SearchFacet
                  key={i}
                  title={title}
                  name={name}
                  results={this.mergeFacetOptions(name)}
                  onUpdate={this.onUpdateFacets}
                  currentlySelected={activeFacets.get(name) || []}
                  labelFunction={labelFunction}
                />
              ))}
            </CourseFilterDrawer>
          </Cell>
          <Cell width={resultsColumnWidth}>
            {error ? null : this.renderResults()}
          </Cell>
        </Grid>
        <LearningResourceDrawer />
        <AddToListDialog />
      </BannerPageWrapper>
    )
  }
}

const mapStateToProps = (state): StateProps => {
  const { search } = state
  const { results, total, initialLoad, facets } = search.data

  return {
    results,
    facets,
    total,
    initialLoad,
    loaded:     search.loaded,
    processing: search.processing,
    favorites:  favoritesSelector(state)
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

const mapPropsToConfig = () => [favoritesRequest()]

export default compose(
  connect<Props, OwnProps, _, _, _, _>(
    mapStateToProps,
    mapDispatchToProps
  ),
  connectRequest(mapPropsToConfig)
)(CourseSearchPage)
