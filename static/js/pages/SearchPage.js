// @flow
/* global SETTINGS: false */
import qs from "query-string"
import R from "ramda"
import React from "react"
import InfiniteScroll from "react-infinite-scroller"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import { Loading, PostLoading, withSearchLoading } from "../components/Loading"
import SearchTextbox from "../components/SearchTextbox"
import CanonicalLink from "../components/CanonicalLink"
import { SearchFilterPicker } from "../components/Picker"
import SearchResult from "../components/SearchResult"
import { Cell, Grid } from "../components/Grid"

import { actions } from "../actions"
import { clearSearch } from "../actions/search"
import { SEARCH_FILTER_ALL, updateSearchFilterParam } from "../lib/picker"
import { preventDefaultAndInvoke, emptyOrNil } from "../lib/util"
import { toggleUpvote } from "../util/api_actions"
import { validateSearchQuery } from "../lib/validation"

import type { Location, Match } from "react-router"
import type { Dispatch } from "redux"
import type { Channel, CommentInTree, Post } from "../flow/discussionTypes"
import type {
  SearchInputs,
  SearchParams,
  PostResult,
  CommentResult,
  ProfileResult
} from "../flow/searchTypes"

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
  results: Array<PostResult | CommentResult | ProfileResult>,
  searchLoaded: boolean,
  searchProcessing: boolean,
  suggest: Array<string>,
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
    clearSearch()
    if (text) {
      this.runSearch()
    }
  }

  componentWillUnmount() {
    const { clearSearch } = this.props
    clearSearch()
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
      suggest,
      total,
      toggleUpvote,
      upvotedPosts
    } = this.props
    const { from, votedComments } = this.state

    if (searchProcessing && initialLoad) {
      return <PostLoading />
    }

    if (
      !results.length &&
      (!suggest.length || suggest[0] === this.state.text)
    ) {
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
        {!emptyOrNil(suggest) && suggest[0] !== this.state.text ? (
          <div className="suggestion">
            Did you mean
            {suggest.map((suggestion, i) => (
              <span key={i}>
                <a
                  onClick={preventDefaultAndInvoke(() =>
                    this.useSuggestion(suggestion)
                  )}
                >
                  {` ${suggestion}`}
                </a>
                {i < suggest.length - 1 ? " | " : ""}
              </span>
            ))}
          </div>
        ) : null}
        {results.length ? (
          results.map((result, i) => (
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
          ))
        ) : (
          <div className="empty-list-msg">There are no results to display.</div>
        )}
      </InfiniteScroll>
    )
  }

  updateText = (event: ?Event) => {
    // $FlowFixMe: event.target.value exists
    const text = event ? event.target.value : ""
    this.setState({ text })
  }

  useSuggestion = async (text: string) => {
    await this.setState({ text })
    this.runSearch()
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
        <Cell mobileWidth={8} width={7}>
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
  const { channelName } = ownProps
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
  const { results, total, suggest, initialLoad } = search.data
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
    loaded: channelName ? channelLoaded : true,
    notFound,
    notAuthorized,
    searchLoaded,
    searchProcessing,
    suggest,
    upvotedPosts
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
  toggleUpvote: toggleUpvote(dispatch),
  dispatch
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withSearchLoading
)(SearchPage)
