// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import qs from "query-string"

import PostList from "../components/PostList"
import Card from "../components/Card"

import withLoading from "../components/Loading"
import withNavSidebar from "../hoc/withNavSidebar"
import PostListNavigation from "../components/PostListNavigation"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getPostIds } from "../lib/posts"
import { FRONTPAGE_URL } from "../lib/url"
import { toggleUpvote } from "../util/api_actions"
import { getSubscribedChannels } from "../lib/redux_selectors"

import type { Dispatch } from "redux"
import type { Location } from "react-router"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"

// querystring doesn't match
const shouldLoadData = R.complement(R.eqBy(R.path(["location", "search"])))

class HomePage extends React.Component {
  props: {
    location: Location,
    dispatch: Dispatch,
    posts: Array<Post>,
    subscribedChannels: RestState<Array<string>>,
    channels: RestState<Map<string, Channel>>,
    showSidebar: boolean,
    pagination: PostListPagination
  }

  componentWillMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = () => {
    const { dispatch, location: { search } } = this.props

    dispatch(actions.frontpage.get(qs.parse(search))).then(response => {
      dispatch(setPostData(response.posts))
    })
  }

  render() {
    const { posts, pagination, dispatch } = this.props
    const dispatchableToggleUpvote = toggleUpvote(dispatch)

    return (
      <Card title="Home">
        <PostList
          posts={posts}
          toggleUpvote={dispatchableToggleUpvote}
          showChannelLinks={true}
        />
        {pagination
          ? <PostListNavigation
            after={pagination.after}
            afterCount={pagination.after_count}
            before={pagination.before}
            beforeCount={pagination.before_count}
            pathname={FRONTPAGE_URL}
          />
          : null}
      </Card>
    )
  }
}

const mapStateToProps = state => {
  const frontpage = state.frontpage.data
  const posts = state.posts.data
  return {
    posts:              safeBulkGet(getPostIds(frontpage), posts),
    subscribedChannels: getSubscribedChannels(state),
    pagination:         frontpage.pagination,
    channels:           state.channels,
    showSidebar:        state.ui.showSidebar,
    loaded:             state.frontpage.loaded
  }
}

export default R.compose(connect(mapStateToProps), withNavSidebar, withLoading)(
  HomePage
)
