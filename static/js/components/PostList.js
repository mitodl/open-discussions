// @flow
import React from "react"

import CompactPostDisplay from "./CompactPostDisplay"

import type { Post } from "../flow/discussionTypes"

const renderPosts = (posts, showChannelLinks, toggleUpvote) =>
  posts.map((post, index) =>
    <CompactPostDisplay
      post={post}
      key={index}
      showChannelLink={showChannelLinks}
      toggleUpvote={toggleUpvote}
    />
  )

type PostListProps = {
  posts: Array<Post>,
  showChannelLinks?: boolean,
  toggleUpvote: Post => void
}

const PostList = (props: PostListProps) => {
  const { posts, showChannelLinks, toggleUpvote } = props

  return (
    <div className="post-list">
      {posts.length > 0
        ? renderPosts(posts, showChannelLinks, toggleUpvote)
        : <div className="empty-list-msg">There are no posts to display.</div>}
    </div>
  )
}

export default PostList
