// @flow
import React from "react"
import { connect } from "react-redux"
import R from "ramda"
import qs from "query-string"

import PostList from "../components/PostList"
import Card from "../components/Card"
import withLoading from "../components/Loading"
import withSingleColumn from "../hoc/withSingleColumn"
import PostListNavigation from "../components/PostListNavigation"
import { PostSortPicker } from "../components/SortPicker"
import {
  withPostModeration,
  postModerationSelector
} from "../hoc/withPostModeration"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { safeBulkGet } from "../lib/maps"
import { getPostIds } from "../lib/posts"
import { FRONTPAGE_URL } from "../lib/url"
import { toggleUpvote } from "../util/api_actions"
import { getSubscribedChannels } from "../lib/redux_selectors"
import { updatePostSortParam, POSTS_SORT_HOT } from "../lib/sorting"

import type { Dispatch } from "redux"
import type { Location } from "react-router"
import type { RestState } from "../flow/restTypes"
import type { Channel, Post, PostListPagination } from "../flow/discussionTypes"

// querystring doesn't match
const shouldLoadData = R.complement(R.eqBy(R.path(["location", "search"])))

class HomePage extends React.Component<*, void> {
  props: {
    location: Location,
    dispatch: Dispatch<*>,
    posts: Array<Post>,
    subscribedChannels: RestState<Array<string>>,
    channels: RestState<Map<string, Channel>>,
    showSidebar: boolean,
    pagination: PostListPagination,
    reportPost: (p: Post) => void
  }

  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  loadData = () => {
    const {
      dispatch,
      location: { search }
    } = this.props

    dispatch(actions.frontpage.get(qs.parse(search))).then(response => {
      dispatch(setPostData(response.posts))
    })
  }

  render() {
    const {
      posts,
      pagination,
      dispatch,
      location: { search },
      reportPost
    } = this.props

    return (
      <Card
        title={
          <div className="post-list-title">
            <div>Home</div>
            <PostSortPicker
              updateSortParam={updatePostSortParam(this.props)}
              value={qs.parse(search).sort || POSTS_SORT_HOT}
            />
          </div>
        }
      >
        <PostList
          posts={posts}
          toggleUpvote={toggleUpvote(dispatch)}
          showChannelLinks={true}
          reportPost={reportPost}
        />
        {pagination ? (
          <PostListNavigation
            after={pagination.after}
            afterCount={pagination.after_count}
            before={pagination.before}
            beforeCount={pagination.before_count}
            pathname={FRONTPAGE_URL}
          />
        ) : null}
      </Card>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const frontpage = state.frontpage.data
  const posts = state.posts.data
  return {
    ...postModerationSelector(state, ownProps),
    posts:              safeBulkGet(getPostIds(frontpage), posts),
    subscribedChannels: getSubscribedChannels(state),
    pagination:         frontpage.pagination,
    channels:           state.channels,
    showSidebar:        state.ui.showSidebar,
    loaded:             state.frontpage.loaded
  }
}

export default R.compose(
  connect(mapStateToProps),
  withPostModeration,
  withSingleColumn("home-page"),
  withLoading
)(HomePage)
