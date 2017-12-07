// @flow
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import { channelURL, postDetailURL } from "../lib/url"
import {
  formatCommentsCount,
  formatPostTitle,
  PostVotingButtons
} from "../lib/posts"

import type { Post } from "../flow/discussionTypes"

class CompactPostDisplay extends React.Component<*, void> {
  props: {
    post: Post,
    showChannelLink: boolean,
    toggleUpvote: Post => void,
    togglePinPost: Post => void,
    showPinUI: boolean,
    isModerator: boolean
  }

  showChannelLink = () => {
    const { post, showChannelLink } = this.props

    return showChannelLink && post.channel_name
      ? <span>
          in{" "}
        <Link to={channelURL(post.channel_name)}>{post.channel_title}</Link>
      </span>
      : null
  }

  render() {
    const {
      post,
      toggleUpvote,
      showPinUI,
      togglePinPost,
      isModerator
    } = this.props
    const formattedDate = moment(post.created).fromNow()

    return (
      <div
        className={`post-summary ${post.stickied && showPinUI ? "sticky" : ""}`}
      >
        <PostVotingButtons post={post} toggleUpvote={toggleUpvote} />
        <div className="summary">
          <div className="post-title">
            {formatPostTitle(post)}
          </div>
          <div className="authored-by">
            by <span className="author-name">{post.author_name}</span>,{" "}
            {formattedDate} {this.showChannelLink()}
          </div>
          <div className="post-links">
            <Link to={postDetailURL(post.channel_name, post.id)}>
              {formatCommentsCount(post)}
            </Link>
            {showPinUI && post.text && isModerator
              ? <a onClick={() => togglePinPost(post)}>
                {post.stickied ? "unpin" : "pin"}
              </a>
              : null}
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  posts: state.posts
})

export default connect(mapStateToProps)(CompactPostDisplay)
