// @flow
import React from "react"
import { connect } from "react-redux"

import SubscriptionsSidebar from "../components/SubscriptionsSidebar"
import Card from "../components/Card"
import ChannelSidebar from "../components/ChannelSidebar"
import PostList from "../components/PostList"
import Loading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { setChannelData } from "../actions/channel"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"
import { toggleUpvote } from "../util/api_actions"

import type { Dispatch } from "redux"
import type { Match } from "react-router"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post } from "../flow/discussionTypes"

class ChannelPage extends React.Component {
  props: {
    match: Match,
    dispatch: Dispatch,
    channels: RestState<Map<string, Channel>>,
    postsForChannel: RestState<Map<string, Array<string>>>,
    posts: RestState<Map<string, Post>>,
    subscribedChannels: RestState<Array<string>>,
  }

  componentWillMount() {
    this.updateRequirements()
  }

  componentDidUpdate(prevProps) {
    if (getChannelName(this.props) !== getChannelName(prevProps)) {
      // if the channel was changed, fetch the new information for this channel
      this.updateRequirements()
    }
  }

  updateRequirements = () => {
    const { dispatch, subscribedChannels } = this.props
    const channelName = getChannelName(this.props)
    dispatch(actions.channels.get(channelName))
    dispatch(actions.postsForChannel.get(channelName)).then(({ posts }) => {
      dispatch(setPostData(posts))
    })

    if (!subscribedChannels.loaded && !subscribedChannels.processing) {
      dispatch(actions.subscribedChannels.get()).then(channels => {
        dispatch(setChannelData(channels))
      })
    }
  }

  renderContents = () => {
    const { channels, postsForChannel, posts, subscribedChannels, dispatch } = this.props
    const channelName = getChannelName(this.props)
    if (!channels.data) {
      return
    }
    const channel = channels.data.get(channelName)
    if (!postsForChannel.data) {
      return
    }
    const postIds = postsForChannel.data.get(channelName)

    if (!channel || !postIds || !posts.data) {
      return null
    } else {
      return (
        <div className="triple-column">
          <ChannelBreadcrumbs channel={channel} />
          <div className="first-column">
            <SubscriptionsSidebar
              // $FlowFixMe: flow doesn't know that we already checked if these are undefined
              subscribedChannels={safeBulkGet(subscribedChannels.data, channels.data)}
            />
          </div>
          <div className="second-column">
            <Card title={channel.title}>
              <PostList
                channel={channel}
                // $FlowFixMe: flow doesn't know that the safeBulkGet above doesn't affect this one
                posts={safeBulkGet(postIds, posts.data)}
                toggleUpvote={toggleUpvote(dispatch)}
              />
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

  render() {
    const { channels, postsForChannel } = this.props
    return <Loading restStates={[channels, postsForChannel]} renderContents={this.renderContents} />
  }
}

const mapStateToProps = state => {
  return {
    channels:           state.channels,
    postsForChannel:    state.postsForChannel,
    posts:              state.posts,
    subscribedChannels:   state.subscribedChannels,
  }
}

export default connect(mapStateToProps)(ChannelPage)
