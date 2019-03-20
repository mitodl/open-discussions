// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"

import CourseDrawer from "./CourseDrawer"

import CanonicalLink from "../components/CanonicalLink"
import Card from "../components/Card"
import { Cell, Grid } from "../components/Grid"
import { Loading, PostLoading } from "../components/Loading"
import SearchFacet from "../components/SearchFacet"
import SearchFilter from "../components/SearchFilter"
import SearchTextbox from "../components/SearchTextbox"
import SearchResult from "../components/SearchResult"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { availabilityLabel } from "../lib/courses"
import { SEARCH_FILTER_COURSE } from "../lib/picker"
import { preventDefaultAndInvoke, toArray } from "../lib/util"
import { mergeFacetResults } from "../lib/search"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type {
  SearchInputs,
  SearchParams,
  Result,
  FacetResult,
  CurrentFacet
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
  total: number
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
  currentFacetGroup: ?CurrentFacet
}

const facetDisplayMap = [
  ["topics", "Subject Area", null],
  ["availability", "Availability", availabilityLabel],
  ["platform", "Platform", _.upperCase]
]

const shouldRunSearch = R.complement(R.eqProps("activeFacets"))

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:         qs.parse(props.location.search).q,
      activeFacets: new Map([
        ["platform", _.union(toArray(qs.parse(props.location.search).p) || [])],
        ["topics", _.union(toArray(qs.parse(props.location.search).t) || [])],
        [
          "availability",
          _.union(toArray(qs.parse(props.location.search).a) || [])
        ]
      ]),
      from:              0,
      error:             null,
      currentFacetGroup: null
    }
  }

  componentDidMount() {
    const { clearSearch, loaded, processing } = this.props
    clearSearch()
    if (!loaded && !processing) {
      this.runSearch()
    }
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    if (shouldRunSearch(prevState, this.state)) {
      this.runSearch()
    }
  }

  clearAllFilters = async () => {
    this.setState({
      text:         null,
      activeFacets: new Map([
        ["platform", []],
        ["availability", []],
        ["topics", []]
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

    const type = SEARCH_FILTER_COURSE
    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q: text,
        type,
        p: activeFacets.get("platform"),
        t: activeFacets.get("topics"),
        a: activeFacets.get("availability")
      })
    })
    let from = this.state.from + SETTINGS.search_page_size
    if (!params.incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from })
    await runSearch({
      channelName: null,
      text,
      facets:      activeFacets,
      type,
      from,
      size:        SETTINGS.search_page_size
    })
  }

  toggleFacet = async (name: string, value: string, isEnabled: boolean) => {
    const { activeFacets, currentFacetGroup } = this.state
    const { facets } = this.props
    const updatedFacets = new Map(activeFacets)
    if (isEnabled) {
      updatedFacets.set(name, _.union(activeFacets.get(name) || [], [value]))
    } else {
      updatedFacets.set(name, _.without(activeFacets.get(name) || [], value))
    }
    // Retain the current facet options and counts for this facet group
    const updatedFacetGroup =
      currentFacetGroup && currentFacetGroup.group === name
        ? currentFacetGroup
        : {
          group:  name,
          result: facets.get(name)
        }
    // $FlowFixMe: nothing undefined here
    this.setState({
      activeFacets:      updatedFacets,
      currentFacetGroup: updatedFacetGroup
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

  renderResults = () => {
    const { results, processing, loaded, total } = this.props
    const { from } = this.state

    if (processing || !loaded) {
      return <PostLoading />
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
        {results.map((result, i) => (
          <SearchResult
            key={i}
            result={result}
            toggleFacet={this.toggleFacet}
          />
        ))}
      </InfiniteScroll>
    )
  }

  render() {
    const { match } = this.props
    const { text, error, activeFacets } = this.state

    return (
      <React.Fragment>
        <Grid className="main-content two-column search-page">
          <Cell width={12}>
            <MetaTags>
              <CanonicalLink match={match} />
            </MetaTags>
            <div className="course-search-input">
              <SearchTextbox
                onChange={this.updateText}
                value={text || ""}
                onClear={this.updateText}
                onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
                validation={error}
              />
            </div>
            <div className="search-filters-row">
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
              {_.flatten(_.toArray(activeFacets.values())).length > 0 ? (
                <div
                  className="search-filters-clear"
                  onClick={this.clearAllFilters}
                >
                  Clear all filters
                </div>
              ) : null}
            </div>
          </Cell>
          <Cell width={4}>
            <Card>
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
            </Card>
          </Cell>
          <Cell width={8}>{error ? null : this.renderResults()}</Cell>
        </Grid>
        <CourseDrawer />
      </React.Fragment>
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
    processing: search.processing
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

export default connect<Props, OwnProps, _, _, _, _>(
  mapStateToProps,
  mapDispatchToProps
)(CourseSearchPage)
