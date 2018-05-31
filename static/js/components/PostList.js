// @flow
import React from "react"

import CompactPostDisplay from "./CompactPostDisplay"

import type { Post } from "../flow/discussionTypes"

type PostListProps = {
  posts: Array<Post>,
  showChannelLinks?: boolean,
  showPinUI?: boolean,
  toggleUpvote: Post => void,
  togglePinPost?: Post => Promise<*>,
  isModerator?: boolean,
  reportPost: (p: Post) => void,
  removePost?: (p: Post) => void
}

const PostList = (props: PostListProps) => {
  const {
    posts,
    showChannelLinks,
    showPinUI,
    isModerator,
    toggleUpvote,
    togglePinPost,
    reportPost,
    removePost
  } = props

  return (
    <div className="post-list">
      {posts.length > 0 ? (
        posts.map((post, index) => (
          <CompactPostDisplay
            post={post}
            key={index}
            showChannelLink={showChannelLinks}
            toggleUpvote={toggleUpvote}
            showPinUI={showPinUI}
            isModerator={isModerator}
            togglePinPost={togglePinPost}
            reportPost={reportPost}
            removePost={removePost}
          />
        ))
      ) : (
        <div className="empty-list-msg">There are no posts to display.</div>
      )}
    </div>
  )
}

export default PostList
