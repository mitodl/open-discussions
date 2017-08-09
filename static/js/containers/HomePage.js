// @flow
import React from "react"
import { connect } from "react-redux"

import SubscriptionsSidebar from "../components/SubscriptionsSidebar"
import PostList from "../components/PostList"
import Card from "../components/Card"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { setChannelData } from "../actions/channel"
import { safeBulkGet } from "../lib/maps"
import { toggleUpvote } from "../util/api_actions"

import type { Dispatch } from "redux"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post } from "../flow/discussionTypes"

class HomePage extends React.Component {
  props: {
    dispatch: Dispatch,
    frontpage: RestState<Array<string>>,
    posts: RestState<Map<string, Post>>,
    subscribedChannels: RestState<Array<string>>,
    channels: RestState<Map<string, Channel>>
  }

  componentWillMount() {
    this.fetchFrontpage()
  }

  fetchFrontpage = () => {
    const { dispatch, subscribedChannels } = this.props

    dispatch(actions.frontpage.get()).then(posts => {
      dispatch(setPostData(posts))
    })

    if (!subscribedChannels.loaded && !subscribedChannels.processing) {
      dispatch(actions.subscribedChannels.get()).then(channels => {
        dispatch(setChannelData(channels))
      })
    }
  }

  render() {
    const { posts, frontpage, subscribedChannels, channels, dispatch } = this.props
    const dispatchableToggleUpvote = toggleUpvote(dispatch)

    return (
      <div className="triple-column">
        <div className="first-column">
          <SubscriptionsSidebar
            // $FlowFixMe: flow thinks these might be undefined
            subscribedChannels={safeBulkGet(subscribedChannels.data, channels.data)}
          />
        </div>
        <div className="second-column">
          <Card title="Home Page">
            <PostList
              // $FlowFixMe: flow thinks these might be undefined
              posts={safeBulkGet(frontpage.data, posts.data)}
              toggleUpvote={dispatchableToggleUpvote}
              showChannelLinks={true}
            />
          </Card>
        </div>
        <div className="third-column" />
        <br className="clear" />
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    posts:              state.posts,
    frontpage:          state.frontpage,
    subscribedChannels: state.subscribedChannels,
    channels:           state.channels
  }
}

export default connect(mapStateToProps)(HomePage)
