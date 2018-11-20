// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import { Loading, PostLoading, withLoading } from "../components/Loading"
import SearchTextbox from "../components/SearchTextbox"
import CanonicalLink from "../components/CanonicalLink"
import { SearchFilterPicker } from "../components/Picker"
import SearchResult from "../components/SearchResult"
import withChannelHeader from "../hoc/withChannelHeader"
import withTwoColumns from "../hoc/withTwoColumns"

import { actions } from "../actions"
import { SEARCH_FILTER_ALL, updateSearchFilterParam } from "../lib/picker"
import { preventDefaultAndInvoke } from "../lib/util"
import { getChannelName } from "../lib/util"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { Channel } from "../flow/discussionTypes"
import type { SearchInputs, SearchParams, Result } from "../flow/searchTypes"

type Props = {
  location: Location,
  history: Object,
  channel: ?Channel,
  channelLoaded: boolean,
  channelName: ?string,
  channelProcessing: boolean,
  getChannel: () => Promise<*>,
  initialLoad: boolean,
  isModerator: boolean,
  match: Match,
  notAuthorized: boolean,
  notFound: boolean,
  runSearch: (params: SearchParams) => Promise<*>,
  results: Array<Result>,
  searchLoaded: boolean,
  searchProcessing: boolean,
  total: number,
  clearSearch: () => void
}
type State = {
  text: string,
  from: number
}

const shouldLoadChannel = (currentProps: Props, prevProps: ?Props) => {
  const { channelName, channelProcessing, channelLoaded } = currentProps
  if (!channelName) {
    // This is a site search page
    return false
  }

  // If channel, check if the channelName params match. Then check if the sort matches.
  // For search, we should do an initial load if search doesn't exist
  if (!prevProps || prevProps.channelName !== channelName) {
    return true
  }
  return !channelLoaded && !channelProcessing
}

const shouldLoadSearch = (currentProps: Props) => {
  const { searchLoaded, searchProcessing } = currentProps
  return !searchLoaded && !searchProcessing
}

export class SearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text: qs.parse(props.location.search).q,
      from: 0
    }
  }

  componentDidMount() {
    if (shouldLoadChannel(this.props)) {
      this.loadChannel()
    }
    this.runSearch()
  }

  componentDidUpdate(prevProps: Props) {
    if (shouldLoadChannel(this.props, prevProps)) {
      this.loadChannel()
    }
    if (shouldLoadSearch(this.props)) {
      this.runSearch()
    }
  }

  loadChannel = async () => {
    const { getChannel } = this.props
    try {
      await getChannel()
    } catch (_) {} // eslint-disable-line no-empty
  }

  loadMore = async () => {
    const { searchLoaded } = this.props

    if (!searchLoaded) {
      // this function will be triggered repeatedly by <InfiniteScroll />, filter it to just once at a time
      return
    }

    await this.runSearch({
      incremental: true
    })
  }

  runSearch = async (params: SearchInputs = { incremental: false }) => {
    const {
      channelName,
      clearSearch,
      history,
      location: { pathname, search },
      runSearch
    } = this.props

    const searchObj = qs.parse(search)
    const text = params.text || this.state.text || undefined

    let type
    if (!R.isNil(params.type)) {
      type = params.type
    } else {
      type = searchObj.type || undefined
    }

    history.replace({
      pathname: pathname,
      search:   qs.stringify({
        ...qs.parse(search),
        q: text,
        type
      })
    })
    let from = this.state.from + SETTINGS.search_page_size
    if (!params.incremental) {
      clearSearch()
      from = 0
    }
    this.setState({ from })
    await runSearch({
      channelName,
      text,
      type,
      from,
      size: SETTINGS.search_page_size
    })
  }

  renderResults = () => {
    const { results, searchProcessing, initialLoad, total } = this.props
    const { from } = this.state

    if (searchProcessing && initialLoad) {
      return <PostLoading />
    }

    if (!results.length) {
      return (
        <div className="empty-list-msg">There are no results to display.</div>
      )
    }

    return (
      <InfiniteScroll
        // TODO: fix
        hasMore={from + SETTINGS.search_page_size < total}
        loadMore={this.loadMore}
        initialLoad={false}
        loader={<Loading className="infinite" key="loader" />}
      >
        {results.map((result, i) => <SearchResult key={i} result={result} />)}
      </InfiniteScroll>
    )
  }

  updateText = (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    this.setState({ text })
  }

  render() {
    const {
      location: { search },
      match
    } = this.props
    const { text } = this.state

    return (
      <React.Fragment>
        <MetaTags>
          <CanonicalLink match={match} />
        </MetaTags>
        <SearchTextbox
          onChange={this.updateText}
          value={text || ""}
          onClear={this.updateText}
          onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
        />
        <div className="post-list-title">
          <SearchFilterPicker
            updatePickerParam={R.curry((type, event) => {
              updateSearchFilterParam(this.props, event)
              this.runSearch({ type, incremental: false })
            })}
            value={qs.parse(search).type || SEARCH_FILTER_ALL}
          />
        </div>
        {this.renderResults()}
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const { channels, search } = state
  const channel = channels.data.get(channelName)

  const channelLoaded = channels.loaded
  const searchLoaded = search.loaded
  const searchProcessing = search.processing
  const loaded = (channels.error ? true : !!channel) && searchLoaded
  const channelProcessing = channels.processing
  const notFound = loaded
    ? channels.error && channels.error.errorStatusCode === 404
    : false
  const notAuthorized = loaded
    ? channels.error && channels.error.errorStatusCode === 403
    : false
  const { results, total, initialLoad } = search.data

  return {
    results,
    total,
    initialLoad,
    channel,
    channelLoaded,
    channelProcessing,
    channelName,
    // loaded is used in withLoading but we only want to look at channel loaded since search loaded will change
    // whenever the user makes a new search
    loaded: channelName ? channelLoaded : true,
    notFound,
    notAuthorized,
    searchLoaded,
    searchProcessing
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps: Props) => ({
  runSearch: async (params: SearchParams) => {
    return await dispatch(actions.search.post(params))
  },
  clearSearch: () => {
    dispatch(actions.search.clear())
  },
  getChannel: async () => {
    const channelName = getChannelName(ownProps)
    await dispatch(actions.channels.get(channelName))
  }
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withChannelHeader(true),
  withTwoColumns("search-page"),
  withLoading(PostLoading)
)(SearchPage)
