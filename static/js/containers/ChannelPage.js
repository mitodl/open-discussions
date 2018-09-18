// @flow
/* global SETTINGS */
import React from "react"
import R from "ramda"
import qs from "query-string"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import CanonicalLink from "../components/CanonicalLink"
import { withPostLoading } from "../components/Loading"
import withChannelSidebar from "../hoc/withChannelSidebar"
import { PostSortPicker } from "../components/SortPicker"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"
import withPostList from "../hoc/withPostList"
import IntraPageNav from "../components/IntraPageNav"
import { withChannelTracker } from "../hoc/withChannelTracker"

import { actions } from "../actions"
import { setPostData, clearPostError } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { getPostIds } from "../lib/posts"
import { anyErrorExcept404 } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { formatTitle } from "../lib/title"
import { clearChannelError } from "../actions/channel"
import { evictPostsForChannel } from "../actions/posts_for_channel"
import { updatePostSortParam, POSTS_SORT_HOT } from "../lib/sorting"

import type { Dispatch } from "redux"
import type { Match, Location } from "react-router"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"

type ChannelPageProps = {
  match: Match,
  location: Location,
  dispatch: Dispatch<any>,
  channelName: string,
  channel: ?Channel,
  postsForChannel: ?Array<string>,
  posts: ?Array<Post>,
  subscribedChannels: ?Array<Channel>,
  pagination: PostListPagination,
  errored: boolean,
  isModerator: boolean,
  notFound: boolean,
  reportPost: (p: Post) => void,
  removePost: (p: Post) => void,
  canLoadPosts: boolean,
  renderPosts: Function,
  loadPosts: (search: PostListPagination) => Promise<*>
}

const shouldLoadData = R.complement(
  R.allPass([
    // if channelName values don't match
    R.eqProps("channelName"),
    // querystring doesn't match
    R.eqBy(R.path(["location", "search"]))
  ])
)

export class ChannelPage extends React.Component<ChannelPageProps> {
  componentDidMount() {
    this.loadData()
  }

  componentWillUnmount() {
    this.clearData(this.props.channelName)
  }

  componentDidUpdate(prevProps: ChannelPageProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.clearData(prevProps.channelName)
      this.loadData()
    }
  }

  clearData = (channelName: string) => {
    const { dispatch } = this.props
    dispatch(evictPostsForChannel(channelName))
  }

  loadData = async () => {
    const {
      dispatch,
      errored,
      notFound,
      channelName,
      loadPosts,
      location: { search }
    } = this.props
    if (errored || notFound) {
      dispatch(clearChannelError())
      dispatch(clearPostError())
    }

    try {
      await dispatch(actions.channels.get(channelName))
      await loadPosts(qs.parse(search))
    } catch (_) {} // eslint-disable-line no-empty
  }

  render() {
    const {
      match,
      channel,
      subscribedChannels,
      posts,
      location: { search },
      renderPosts
    } = this.props

    if (!channel || !subscribedChannels || !posts) {
      return null
    } else {
      return (
        <React.Fragment>
          <MetaTags>
            <title>{formatTitle(channel.title)}</title>
            <CanonicalLink match={match} />
          </MetaTags>
          <IntraPageNav>
            <a href="#" className="active">
              Posts
            </a>
          </IntraPageNav>
          <div className="post-list-title">
            <div>All</div>
            <PostSortPicker
              updateSortParam={updatePostSortParam(this.props)}
              value={qs.parse(search).sort || POSTS_SORT_HOT}
            />
          </div>
          {renderPosts()}
        </React.Fragment>
      )
    }
  }
}

const mapStateToProps = (state, ownProps) => {
  const { channels } = state
  const channelName = getChannelName(ownProps)
  const postsForChannel = state.postsForChannel.data.get(channelName) || {}
  const channel = channels.data.get(channelName)
  const postIds = getPostIds(postsForChannel)
  // NOTE: postsForChannel.postIds cannot be `postIds` because that never evals to a Nil value
  const loaded = channels.error
    ? true
    : R.none(R.isNil, [channel, postsForChannel.postIds])
  const notFound = loaded
    ? channels.error && channels.error.errorStatusCode === 404
    : false
  const notAuthorized = loaded
    ? channels.error && channels.error.errorStatusCode === 403
    : false

  const userIsModerator = channel && channel.user_is_moderator

  return {
    ...postModerationSelector(state, ownProps),
    channelName,
    channel,
    loaded,
    canLoadMore:        !state.postsForChannel.processing,
    notFound,
    notAuthorized,
    isModerator:        userIsModerator,
    pagination:         postsForChannel.pagination,
    posts:              safeBulkGet(postIds, state.posts.data),
    subscribedChannels: getSubscribedChannels(state),
    showPinUI:          true,
    showChannelLinks:   false,
    showReportPost:     true,
    showRemovePost:     true,
    showTogglePinPost:  true,
    errored:            anyErrorExcept404([
      channels,
      state.posts,
      state.subscribedChannels
    ])
  }
}

const mapDispatchToProps = (
  dispatch: Dispatch<any>,
  ownProps: ChannelPageProps
) => ({
  loadPosts: async (search: Object) => {
    const channelName = getChannelName(ownProps)

    const response = await dispatch(
      actions.postsForChannel.get(channelName, search)
    )
    dispatch(setPostData(response.response.posts))
  },
  dispatch: dispatch
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withPostModeration,
  withChannelSidebar("channel-page"),
  withChannelTracker,
  withPostList,
  withPostLoading
)(ChannelPage)
