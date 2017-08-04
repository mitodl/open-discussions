// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import Card from "../components/Card"
import ChannelSidebar from "../components/ChannelSidebar"
import PostList from "../components/PostList"
import Loading from "../components/Loading"
import ChannelBreadcrumbs from "../components/ChannelBreadcrumbs"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getChannelName } from "../lib/util"

import type { Dispatch } from "redux"
import type { Match } from "react-router"

class ChannelPage extends React.Component {
  props: {
    match: Match,
    dispatch: Dispatch,
    channels: Object,
    postsForChannel: Object,
    posts: Object
  }

  componentWillMount() {
    const { dispatch } = this.props
    const channelName = getChannelName(this.props)
    dispatch(actions.channels.get(channelName))
    dispatch(actions.postsForChannel.get(channelName)).then(({ posts }) => {
      dispatch(setPostData(posts))
    })
  }

  renderContents(channelName, channels, postsForChannel, posts) {
    const channel = channels.data.get(channelName)
    const postIds = postsForChannel.data.get(channelName)

    if (R.isNil(channel) || R.isNil(postIds)) {
      return null
    } else {
      return (
        <div className="double-column">
          <ChannelBreadcrumbs channel={channel} />
          <div className="first-column">
            <Card title={channel.title}>
              <PostList channel={channel} posts={safeBulkGet(postIds, posts.data)} />
            </Card>
          </div>
          <div className="second-column">
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
    const { channels, postsForChannel, posts } = this.props
    const channelName = getChannelName(this.props)

    return (
      <Loading
        restStates={[channels, postsForChannel]}
        renderContents={() => this.renderContents(channelName, channels, postsForChannel, posts)}
      />
    )
  }
}

const mapStateToProps = state => {
  return {
    channels:        state.channels,
    postsForChannel: state.postsForChannel,
    posts:           state.posts
  }
}

export default connect(mapStateToProps)(ChannelPage)
