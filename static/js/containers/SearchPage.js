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
import ChannelNavbar from "../components/ChannelNavbar"
import CanonicalLink from "../components/CanonicalLink"
import { SearchFilterPicker } from "../components/Picker"
import SearchResult from "../components/SearchResult"
import withChannelHeader from "../hoc/withChannelHeader"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { SEARCH_FILTER_ALL, updateSearchFilterParam } from "../lib/picker"
import { preventDefaultAndInvoke } from "../lib/util"
import { getChannelName } from "../lib/util"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { Channel, CommentInTree, Post } from "../flow/discussionTypes"
import type { SearchInputs, SearchParams, Result } from "../flow/searchTypes"
import { Cell, Grid } from "../components/Grid"

import { toggleUpvote } from "../util/api_actions"
import { validateSearchQuery } from "../lib/validation"

type Props = {
  dispatch: Dispatch<any>,
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
  clearSearch: () => void,
  toggleUpvote: () => void,
  upvotedPosts: Map<string, Post>
}
type State = {
  text: string,
  from: number,
  votedComments: Map<string, CommentInTree>,
  error: ?string
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

export class SearchPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      text:          qs.parse(props.location.search).q,
      from:          0,
      votedComments: new Map(),
      error:         null
    }
  }

  componentDidMount() {
    const { text } = this.state
    const { clearSearch } = this.props
    if (shouldLoadChannel(this.props)) {
      this.loadChannel()
    }
    clearSearch()
    if (text) {
      this.runSearch()
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (shouldLoadChannel(this.props, prevProps)) {
      this.loadChannel()
    }
  }

  downvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    const updatedComment = await dispatch(
      actions.comments.patch(comment.id, {
        downvoted: !comment.downvoted
      })
    )
    this.updateVotedComments(updatedComment)
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

    const error = validateSearchQuery(text)
    if (error) {
      clearSearch()
      this.setState({ error })
      return
    }

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
    this.setState({ from, error })
    await runSearch({
      channelName,
      text,
      type,
      from,
      size: SETTINGS.search_page_size
    })
  }

  renderResults = () => {
    const {
      results,
      searchProcessing,
      initialLoad,
      total,
      toggleUpvote,
      upvotedPosts
    } = this.props
    const { from, votedComments } = this.state

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
        initialLoad={from === 0}
        loader={<Loading className="infinite" key="loader" />}
      >
        {results.map((result, i) => (
          <SearchResult
            key={i}
            result={result}
            toggleUpvote={toggleUpvote}
            upvotedPost={
              result.object_type === "post"
                ? upvotedPosts.get(result.post_id)
                : null
            }
            votedComment={
              result.object_type === "comment"
                ? votedComments.get(result.comment_id) || null
                : null
            }
            commentDownvote={this.downvote}
            commentUpvote={this.upvote}
          />
        ))}
      </InfiniteScroll>
    )
  }

  updateText = (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    this.setState({ text })
  }

  upvote = async (comment: CommentInTree) => {
    const { dispatch } = this.props
    const updatedComment = await dispatch(
      actions.comments.patch(comment.id, {
        upvoted: !comment.upvoted
      })
    )
    this.updateVotedComments(updatedComment)
  }

  updateVotedComments = (comment: CommentInTree) => {
    const { votedComments } = this.state
    const upvotedCommentMap = new Map(votedComments)
    upvotedCommentMap.set(comment.id, comment)
    this.setState({ votedComments: upvotedCommentMap })
  }

  render() {
    const {
      location: { search },
      match
    } = this.props
    const { text, error } = this.state

    return (
      <Grid className="main-content two-column search-page">
        <Cell width={8}>
          <MetaTags>
            <CanonicalLink match={match} />
          </MetaTags>
          <SearchTextbox
            onChange={this.updateText}
            value={text || ""}
            onClear={this.updateText}
            onSubmit={preventDefaultAndInvoke(() => this.runSearch())}
            validation={error}
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
          {error ? null : this.renderResults()}
        </Cell>
      </Grid>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const { channels, search, posts } = state
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
  const upvotedPosts = posts.data

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
    loaded:      channelName ? channelLoaded : true,
    navbarItems: <ChannelNavbar channel={channel} />,
    notFound,
    notAuthorized,
    searchLoaded,
    searchProcessing,
    upvotedPosts
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps: Props) => ({
  runSearch: async (params: SearchParams) => {
    return await dispatch(actions.search.post(params))
  },
  clearSearch: async () => {
    dispatch(actions.search.clear())
    await dispatch(clearSearch())
  },
  getChannel: async () => {
    const channelName = getChannelName(ownProps)
    await dispatch(actions.channels.get(channelName))
  },
  toggleUpvote: toggleUpvote(dispatch),
  dispatch
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withChannelHeader,
  withLoading(PostLoading)
)(SearchPage)
