// @flow
/* global SETTINGS */
import React from "react"
import R from "ramda"
import qs from "query-string"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"

import Card from "../components/Card"
import PostList from "../components/PostList"
import withLoading from "../components/Loading"
import PostListNavigation from "../components/PostListNavigation"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import withNavAndChannelSidebars from "../hoc/withNavAndChannelSidebars"
import NotFound from "../components/404"

import { actions } from "../actions"
import { setPostData, clearPostError } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { isModerator } from "../lib/channels"
import { getPostIds } from "../lib/posts"
import { channelURL } from "../lib/url"
import { toggleUpvote } from "../util/api_actions"
import { anyErrorExcept404 } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { formatTitle } from "../lib/title"
import { clearChannelError } from "../actions/channel"
import { evictPostsForChannel } from "../actions/posts_for_channel"

import type { Dispatch } from "redux"
import type { Match, Location } from "react-router"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"

type ChannelPageProps = {
  match: Match,
  location: Location,
  dispatch: Dispatch,
  channelName: string,
  channel: ?Channel,
  postsForChannel: ?Array<string>,
  posts: ?Array<Post>,
  subscribedChannels: ?Array<Channel>,
  pagination: PostListPagination,
  errored: boolean,
  isModerator: boolean,
  notFound: boolean
}

const shouldLoadData = R.complement(
  R.allPass([
    // if channelName values don't match
    R.eqProps("channelName"),
    // querystring doesn't match
    R.eqBy(R.path(["location", "search"]))
  ])
)

class ChannelPage extends React.Component<*, void> {
  props: ChannelPageProps

  componentWillMount() {
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
      await dispatch(actions.channelModerators.get(channelName))
      this.fetchPostsForChannel()
    } catch (_) {} // eslint-disable-line no-empty
  }

  fetchPostsForChannel = async () => {
    const { dispatch, channelName, location: { search } } = this.props

    const { response: { posts } } = await dispatch(
      actions.postsForChannel.get(channelName, qs.parse(search))
    )
    dispatch(setPostData(posts))
  }

  render() {
    const {
      dispatch,
      channel,
      subscribedChannels,
      posts,
      pagination,
      channelName,
      isModerator,
      notFound
    } = this.props

    if (notFound) {
      return <NotFound />
    }

    if (!channel || !subscribedChannels || !posts) {
      return null
    } else {
      return (
        <div>
          <DocumentTitle title={formatTitle(channel.title)} />
          <ChannelBreadcrumbs channel={channel} />
          <Card title={channel.title}>
            <PostList
              channel={channel}
              posts={posts}
              toggleUpvote={toggleUpvote(dispatch)}
              isModerator={isModerator}
              togglePinPost={this.togglePinPost}
              showPinUI
            />
            {pagination
              ? <PostListNavigation
                after={pagination.after}
                afterCount={pagination.after_count}
                before={pagination.before}
                beforeCount={pagination.before_count}
                pathname={channelURL(channelName)}
              />
              : null}
          </Card>
        </div>
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
  const channelModerators = state.channelModerators.data.get(channelName) || []
  // NOTE: postsForChannel.postIds cannot be `postIds` because that never evals to a Nil value
  const loaded = channels.error
    ? true
    : R.none(R.isNil, [channel, postsForChannel.postIds])
  const notFound = loaded
    ? channels.error && channels.error.errorStatusCode === 404
    : false

  return {
    channelName,
    channel,
    loaded,
    notFound,
    isModerator:        isModerator(channelModerators, SETTINGS.username),
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
  withNavAndChannelSidebars,
  withLoading
)(ChannelPage)
