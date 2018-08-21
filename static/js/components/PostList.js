// @flow
import React from "react"

import CompactPostDisplay from "./CompactPostDisplay"

import type { Post } from "../flow/discussionTypes"

type Props = {
  posts: Array<Post>,
  showChannelLinks: boolean,
  showPinUI: boolean,
  toggleUpvote: Post => void,
  togglePinPost?: ?(post: Post) => Promise<*>,
  isModerator: boolean,
  reportPost?: ?(post: Post) => void,
  removePost?: ?(post: Post) => void
}

export default class PostList extends React.Component<Props> {
  static defaultProps = {
    showPinUI:        false,
    isModerator:      false,
    showChannelLinks: false
  }

  render() {
    const {
      posts,
      showChannelLinks,
      showPinUI,
      isModerator,
      toggleUpvote,
      togglePinPost,
      reportPost,
      removePost
    } = this.props

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
}
