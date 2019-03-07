// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"
import _ from "lodash"
import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"

import CourseDrawer from "./CourseDrawer"
import CanonicalLink from "../components/CanonicalLink"
import Card from "../components/Card"
import { Cell, Grid } from "../components/Grid"
import { Loading, PostLoading } from "../components/Loading"
import SearchFacet from "../components/SearchFacet"
import SearchTextbox from "../components/SearchTextbox"
import SearchResult from "../components/SearchResult"
import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { SEARCH_FILTER_COURSE } from "../lib/picker"
import { preventDefaultAndInvoke, toArray } from "../lib/util"

import type {
  SearchInputs,
  SearchParams,
  Result,
  FacetResult
} from "../flow/searchTypes"

type Props = {
  dispatch: Dispatch<any>,
  location: Location,
  history: Object,
  initialLoad: boolean,
  isModerator: boolean,
  match: Match,
  runSearch: (params: SearchParams) => Promise<*>,
  results: Array<Result>,
  facets: Map<string, FacetResult>,
  loaded: boolean,
  processing: boolean,
  total: number,
  facetVisibility: Map<string, boolean>,
  clearSearch: () => void
}
type State = {
  text: string,
  topics: Array<string>,
  platforms: Array<string>,
  availabilities: Array<string>,
  from: number,
  error: ?string
}

const shouldRunSearch = R.complement(
  R.allPass([
    R.eqProps("text"),
    R.eqProps("topics"),
    R.eqProps("platforms"),
    R.eqProps("availabilities")
  ])
)

export class CourseSearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:           qs.parse(props.location.search).q,
      topics:         qs.parse(props.location.search).t,
      platforms:      qs.parse(props.location.search).p,
      availabilities: qs.parse(props.location.search).a,
      from:           0,
      error:          null
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

    const text = params.text || this.state.text || undefined
    const platforms = params.platforms || this.state.platforms || undefined
    const topics = params.topics || this.state.topics || undefined
    const availabilities =
      params.availabilities || this.state.availabilities || undefined

    const type = SEARCH_FILTER_COURSE
    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q: text,
        type,
        p: platforms,
        t: topics,
        a: availabilities
      })
    })
    let from = this.state.from + SETTINGS.search_page_size
    if (!params.incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from })
    const facets = new Map([
      ["platform", toArray(platforms) || []],
      ["topics", toArray(topics) || []],
      ["availability", toArray(availabilities) || []]
    ])
    await runSearch({
      channelName: null,
      text,
      facets,
      type,
      from,
      size:        SETTINGS.search_page_size
    })
  }

  toggleFacet = async (name: string, value: string, isEnabled: boolean) => {
    if (isEnabled) {
      this.setState({
        [name]: _.union(this.state[name], [value])
      })
    } else {
      this.setState({
        [name]: _.without(this.state[name], value)
      })
    }
  }

  onUpdateFacets = (e: Object) => {
    this.toggleFacet(e.target.name, e.target.value, e.target.checked)
  }

  updateText = (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    this.setState({ text })
  }

  renderResults = () => {
    const { results, processing, loaded, total } = this.props
    const { from } = this.state

    if (processing || !loaded) {
      return <PostLoading />
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
    const { match, facets, total, facetVisibility } = this.props
    const { text, error, topics, platforms, availabilities } = this.state

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
            {total === 0 ? (
              <div className="empty-list-msg">
                There are no results to display.
              </div>
            ) : null}
          </Cell>
          <Cell width={4}>
            {facets && total > 0 ? (
              <Card>
                <SearchFacet
                  title="Subject area"
                  name="topics"
                  results={facets.get("topics")}
                  onUpdate={this.onUpdateFacets}
                  currentlySelected={topics}
                  showAll={facetVisibility.has("topics")}
                />
                <SearchFacet
                  title="Availability"
                  name="availabilities"
                  results={facets.get("availability")}
                  onUpdate={this.onUpdateFacets}
                  currentlySelected={availabilities}
                  showAll={facetVisibility.has("availabilities")}
                />
                <SearchFacet
                  title="Platform"
                  name="platforms"
                  results={facets.get("platform")}
                  onUpdate={this.onUpdateFacets}
                  labelFunction={_.upperCase}
                  currentlySelected={platforms}
                  showAll={facetVisibility.has("platforms")}
                />
              </Card>
            ) : null}
          </Cell>
          <Cell width={8}>{error ? null : this.renderResults()}</Cell>
        </Grid>
        <CourseDrawer />
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => {
  const { search, ui } = state
  const { results, total, initialLoad, facets } = search.data

  return {
    results,
    facets,
    total,
    initialLoad,
    loaded:          search.loaded,
    processing:      search.processing,
    facetVisibility: ui.facets
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

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(CourseSearchPage)
