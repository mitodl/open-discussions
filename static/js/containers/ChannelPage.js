// @flow
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
import withNavSidebar from "../hoc/withNavSidebar"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { getPostIds } from "../lib/posts"
import { channelURL } from "../lib/url"
import { toggleUpvote } from "../util/api_actions"
import { anyError } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { formatTitle } from "../lib/title"

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
  pagination: PostListPagination
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

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = () => {
    const { dispatch, channelName, location: { search } } = this.props
    dispatch(actions.channels.get(channelName))
    dispatch(
      actions.postsForChannel.get(channelName, qs.parse(search))
    ).then(({ response }) => {
      dispatch(setPostData(response.posts))
    })
  }

  render() {
    const {
      dispatch,
      channel,
      subscribedChannels,
      posts,
      pagination,
      channelName
    } = this.props
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
  const channelName = getChannelName(ownProps)
  const postsForChannel = state.postsForChannel.data.get(channelName) || {}
  const channel = state.channels.data.get(channelName)
  const postIds = getPostIds(postsForChannel)
  return {
    channelName,
    channel,
    pagination:         postsForChannel.pagination,
    posts:              safeBulkGet(postIds, state.posts.data),
    subscribedChannels: getSubscribedChannels(state),
    loaded:             R.none(R.isNil, [channel, postIds]),
    errored:            anyError([state.channels, state.posts, state.subscribedChannels])
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  ChannelPage
)
