// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"

import Card from "../components/Card"
import PostList from "../components/PostList"
import withLoading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"
import withNavSidebar from "../hoc/withNavSidebar"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { toggleUpvote } from "../util/api_actions"
import { anyError } from "../util/rest"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { formatTitle } from "../lib/title"

import type { Dispatch } from "redux"
import type { Match } from "react-router"
import type { Channel, Post } from "../flow/discussionTypes"

type ChannelPageProps = {
  match: Match,
  dispatch: Dispatch,
  channelName: string,
  channel: ?Channel,
  postsForChannel: ?Array<string>,
  posts: ?Array<Post>,
  subscribedChannels: ?Array<Channel>
}

// if channelName values don't match
const shouldLoadData = R.complement(R.eqProps("channelName"))

class ChannelPage extends React.Component {
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
    const { dispatch, channelName } = this.props
    Promise.all([
      dispatch(actions.channels.get(channelName)),
      dispatch(actions.postsForChannel.get(channelName)).then(({ posts }) => {
        dispatch(setPostData(posts))
      })
    ])
  }

  render() {
    const { dispatch, channel, subscribedChannels, posts } = this.props
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
          </Card>
        </div>
      )
    }
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const postIds = state.postsForChannel.data.get(channelName)
  const channel = state.channels.data.get(channelName)
  return {
    channelName,
    channel,
    posts:              safeBulkGet(postIds || [], state.posts.data),
    subscribedChannels: getSubscribedChannels(state),
    loaded:             R.none(R.isNil, [channel, postIds]),
    errored:            anyError([state.channels, state.posts, state.subscribedChannels])
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  ChannelPage
)
