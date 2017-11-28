// @flow
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import ReactMarkdown from "react-markdown"

import { formatPostTitle, PostVotingButtons } from "../lib/posts"
import { addEditedMarker } from "../lib/reddit_objects"

import type { Post } from "../flow/discussionTypes"

const textContent = post =>
  <ReactMarkdown
    disallowedTypes={["Image"]}
    source={addEditedMarker(post)}
    escapeHtml
    className="text-content"
  />

class ExpandedPostDisplay extends React.Component<*, void> {
  props: {
    post: Post,
    toggleUpvote: Post => void
  }

  render() {
    const { post, toggleUpvote } = this.props
    const formattedDate = moment(post.created).fromNow()

    return (
      <div className="post-summary expanded">
        <div className="summary">
          <img className="profile-image" src={post.profile_image} />
          <div className="post-title">
            {formatPostTitle(post)}
          </div>
          <div className="authored-by">
            by <span className="author-name">{post.author_name}</span>,{" "}
            {formattedDate}
          </div>
        </div>
        {post.text ? textContent(post) : null}
        <PostVotingButtons
          post={post}
          className="expanded"
          toggleUpvote={toggleUpvote}
        />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  posts: state.posts
})

export default connect(mapStateToProps)(ExpandedPostDisplay)
