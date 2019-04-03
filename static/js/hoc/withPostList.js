// @flow
import React from "react"
import qs from "query-string"
import InfiniteScroll from "react-infinite-scroller"

import { Loading } from "../components/Loading"
import PostList from "../components/PostList"

import { toggleUpvote } from "../util/api_actions"
import { actions } from "../actions"
import { evictPostsForChannel } from "../actions/posts_for_channel"

import type { Location } from "react-router"
import type { Dispatch } from "redux"
import type { Post, PostListPagination } from "../flow/discussionTypes"

type Props = {
  canLoadMore: boolean,
  isModerator: boolean,
  loadPosts: (search: PostListPagination) => Promise<*>,
  location: Location,
  pagination: PostListPagination,
  posts: ?Array<Post>,
  reportPost: (p: Post) => void,
  removePost: (p: Post) => void,
  deletePost: (p: Post) => void,
  toggleUpvote: (post: Post) => Promise<*>,
  dispatch: Dispatch<any>,
  showChannelLinks: boolean,
  showReportPost: boolean,
  showRemovePost: boolean,
  showDeletePost: boolean,
  showTogglePinPost: boolean,
  showPinUI: boolean,
  channelName?: string
}

const withPostList = (WrappedComponent: Class<React.Component<*, *>>) => {
  class withPostList extends React.Component<*, *> {
    static WrappedComponent: Class<React.Component<*, *>>
    props: Props

    loadMore = async () => {
      const {
        canLoadMore,
        location: { search },
        pagination,
        loadPosts
      } = this.props

      if (!canLoadMore) {
        // this function will be triggered repeatedly by <InfiniteScroll />, filter it to just once at a time
        return
      }

      const newSearch = {
        ...qs.parse(search),
        count: pagination.after_count,
        after: pagination.after
      }

      await loadPosts(newSearch)
    }

    togglePinPost = async (post: Post) => {
      const {
        dispatch,
        loadPosts,
        channelName,
        location: { search }
      } = this.props

      await dispatch(actions.posts.patch(post.id, { stickied: !post.stickied }))
      dispatch(evictPostsForChannel(channelName))
      await loadPosts(qs.parse(search))
    }

    renderPosts = () => {
      const {
        dispatch,
        pagination,
        posts,
        isModerator,
        reportPost,
        removePost,
        deletePost,
        showPinUI,
        showReportPost,
        showRemovePost,
        showDeletePost,
        showChannelLinks,
        showTogglePinPost
      } = this.props

      if (!posts) {
        return null
      }

      let postList = (
        <PostList
          posts={posts}
          toggleUpvote={toggleUpvote(dispatch)}
          isModerator={isModerator}
          togglePinPost={showTogglePinPost ? this.togglePinPost : null}
          reportPost={showReportPost ? reportPost : null}
          deletePost={showDeletePost ? deletePost : null}
          removePost={showRemovePost ? removePost : null}
          showPinUI={showPinUI}
          showChannelLinks={showChannelLinks}
        />
      )

      if (pagination) {
        postList = (
          <InfiniteScroll
            hasMore={!!pagination.after}
            loadMore={this.loadMore}
            initialLoad={false}
            loader={<Loading className="infinite" key="loader" />}
          >
            {postList}
          </InfiniteScroll>
        )
      }

      return postList
    }

    render() {
      return <WrappedComponent renderPosts={this.renderPosts} {...this.props} />
    }
  }

  withPostList.WrappedComponent = WrappedComponent
  return withPostList
}

export default withPostList
