// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import SubscriptionsSidebar from "../components/SubscriptionsSidebar"
import Card from "../components/Card"
import ChannelSidebar from "../components/ChannelSidebar"
import PostList from "../components/PostList"
import withLoading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { setChannelData } from "../actions/channel"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { toggleUpvote } from "../util/api_actions"
import { anyError } from "../util/rest"

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
    const { dispatch, subscribedChannels, channelName } = this.props
    Promise.all([
      dispatch(actions.channels.get(channelName)),
      dispatch(actions.postsForChannel.get(channelName)).then(({ posts }) => {
        dispatch(setPostData(posts))
      }),
      subscribedChannels ||
        dispatch(actions.subscribedChannels.get()).then(channels => {
          dispatch(setChannelData(channels))
        })
    ])
  }

  render() {
    const { dispatch, channel, subscribedChannels, posts } = this.props
    if (!channel || !subscribedChannels || !posts) {
      return null
    } else {
      return (
        <div className="triple-column">
          <ChannelBreadcrumbs channel={channel} />
          <div className="first-column">
            <SubscriptionsSidebar subscribedChannels={subscribedChannels} />
          </div>
          <div className="second-column">
            <Card title={channel.title}>
              <PostList channel={channel} posts={posts} toggleUpvote={toggleUpvote(dispatch)} />
            </Card>
          </div>
          <div className="third-column">
            <Card>
              <ChannelSidebar channel={channel} />
            </Card>
          </div>
          <br className="clear" />
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
    subscribedChannels: state.subscribedChannels.loaded
      ? safeBulkGet(state.subscribedChannels.data, state.channels.data)
      : null,
    loaded:  R.none(R.isNil, [channel, postIds]),
    errored: anyError([state.channels, state.posts, state.subscribedChannels])
  }
}

export default R.compose(connect(mapStateToProps), withLoading)(ChannelPage)
