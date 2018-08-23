// @flow
/* global SETTINGS */
import React from "react"
import R from "ramda"
import qs from "query-string"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import PostList from "../components/PostList"
import Loading from "../components/Loading"
import PostListNavigation from "../components/PostListNavigation"
import withChannelSidebar from "../hoc/withChannelSidebar"
import { PostSortPicker } from "../components/SortPicker"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"

import { actions } from "../actions"
import { setPostData, clearPostError } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { getPostIds } from "../lib/posts"
import { channelURL } from "../lib/url"
import { toggleUpvote } from "../util/api_actions"
import { anyErrorExcept404 } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { formatTitle } from "../lib/title"
import { clearChannelError } from "../actions/channel"
import { evictPostsForChannel } from "../actions/posts_for_channel"
import { updatePostSortParam, POSTS_SORT_HOT } from "../lib/sorting"
import { withChannelTracker } from "../hoc/withChannelTracker"

import type { Dispatch } from "redux"
import type { Match, Location } from "react-router"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"
import type { LoadingProps } from "../components/Loading"

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
  isModerator: boolean,
  reportPost: (p: Post) => void,
  removePost: (p: Post) => void
} & LoadingProps

const shouldLoadData = R.complement(
  R.allPass([
    // if channelName values don't match
    R.eqProps("channelName"),
    // querystring doesn't match
    R.eqBy(R.path(["location", "search"]))
  ])
)

class ChannelPage extends React.Component<ChannelPageProps> {
  componentDidMount() {
    this.loadData()
  }

  componentWillUnmount() {
    this.clearData(this.props.channelName)
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.clearData(prevProps.channelName)
      this.loadData()
    }
  }

  togglePinPost = async (post: Post) => {
    const { dispatch } = this.props

    await dispatch(actions.posts.patch(post.id, { stickied: !post.stickied }))
    this.fetchPostsForChannel()
  }

  clearData = (channelName: string) => {
    const { dispatch } = this.props
    dispatch(evictPostsForChannel(channelName))
  }

  loadData = async () => {
    const { dispatch, errored, notFound, channelName } = this.props
    if (errored || notFound) {
      dispatch(clearChannelError())
      dispatch(clearPostError())
    }

    try {
      await dispatch(actions.channels.get(channelName))

      this.fetchPostsForChannel()
    } catch (_) {} // eslint-disable-line no-empty
  }

  fetchPostsForChannel = async () => {
    const {
      dispatch,
      channelName,
      location: { search }
    } = this.props

    const {
      response: { posts }
    } = await dispatch(
      actions.postsForChannel.get(channelName, qs.parse(search))
    )
    dispatch(setPostData(posts))
  }

  renderPage = () => {
    const {
      dispatch,
      channel,
      subscribedChannels,
      posts,
      pagination,
      channelName,
      isModerator,
      location: { search },
      reportPost,
      removePost
    } = this.props

    if (!channel || !subscribedChannels || !posts) {
      return null
    } else {
      return (
        <React.Fragment>
          <MetaTags>
            <title>{formatTitle(channel.title)}</title>
          </MetaTags>
          <div className="post-list-title">
            <div>{channel.title}</div>
            <PostSortPicker
              updateSortParam={updatePostSortParam(this.props)}
              value={qs.parse(search).sort || POSTS_SORT_HOT}
            />
          </div>
          <PostList
            channel={channel}
            posts={posts}
            toggleUpvote={toggleUpvote(dispatch)}
            isModerator={isModerator}
            togglePinPost={this.togglePinPost}
            reportPost={reportPost}
            removePost={removePost}
            showPinUI
          />
          {pagination ? (
            <PostListNavigation
              after={pagination.after}
              afterCount={pagination.after_count}
              before={pagination.before}
              beforeCount={pagination.before_count}
              pathname={channelURL(channelName)}
            />
          ) : null}
        </React.Fragment>
      )
    }
  }

  render() {
    const { loaded, errored, notAuthorized, notFound } = this.props
    return (
      <Loading
        loaded={loaded}
        errored={errored}
        notAuthorized={notAuthorized}
        notFound={notFound}
      >
        {this.renderPage()}
      </Loading>
    )
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
    notFound,
    notAuthorized,
    isModerator:        userIsModerator,
    pagination:         postsForChannel.pagination,
    posts:              safeBulkGet(postIds, state.posts.data),
    subscribedChannels: getSubscribedChannels(state),
    errored:            anyErrorExcept404([
      channels,
      state.posts,
      state.subscribedChannels
    ])
  }
}

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withChannelSidebar("channel-page"),
  withChannelTracker
)(ChannelPage)
