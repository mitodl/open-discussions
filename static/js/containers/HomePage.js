// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"

import PostList from "../components/PostList"
import Card from "../components/Card"

import withLoading from "../components/Loading"
import withNavSidebar from "../hoc/withNavSidebar"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { toggleUpvote } from "../util/api_actions"
import { getSubscribedChannels } from "../lib/redux_selectors"

import type { Dispatch } from "redux"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post } from "../flow/discussionTypes"

class HomePage extends React.Component {
  props: {
    dispatch: Dispatch,
    frontpage: RestState<Array<string>>,
    posts: RestState<Map<string, Post>>,
    subscribedChannels: RestState<Array<string>>,
    channels: RestState<Map<string, Channel>>,
    showSidebar: boolean
  }

  componentWillMount() {
    this.fetchFrontpage()
  }

  fetchFrontpage = () => {
    const { dispatch } = this.props

    dispatch(actions.frontpage.get()).then(posts => {
      dispatch(setPostData(posts))
    })
  }

  render() {
    const { posts, frontpage, dispatch } = this.props
    const dispatchableToggleUpvote = toggleUpvote(dispatch)

    return (
      <Card title="Home Page">
        <PostList
          // $FlowFixMe: flow thinks these might be undefined
          posts={safeBulkGet(frontpage, posts.data)}
          toggleUpvote={dispatchableToggleUpvote}
          showChannelLinks={true}
        />
      </Card>
    )
  }
}

const mapStateToProps = state => {
  return {
    posts:              state.posts,
    frontpage:          state.frontpage.data,
    subscribedChannels: getSubscribedChannels(state),
    channels:           state.channels,
    showSidebar:        state.ui.showSidebar,
    loaded:             state.frontpage.loaded
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  HomePage
)
