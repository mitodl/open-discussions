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

import type { Post, PostReportRecord } from "../flow/discussionTypes"

class CompactPostDisplay extends React.Component<*, void> {
  props: {
    post: Post,
    showChannelLink: boolean,
    toggleUpvote: Post => void,
    togglePinPost: Post => void,
    showPinUI: boolean,
    isModerator: boolean,
    report?: PostReportRecord,
    removePost?: (p: Post) => void,
    ignorePostReports?: (p: Post) => void
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
      isModerator,
      report,
      removePost,
      ignorePostReports
    } = this.props
    const formattedDate = moment(post.created).fromNow()

    return (
      <div
        className={`post-summary ${post.stickied && showPinUI ? "sticky" : ""}`}
      >
        <PostVotingButtons post={post} toggleUpvote={toggleUpvote} />
        <img className="profile-image" src={post.profile_image} />
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
            {isModerator && report
              ? <div className="report-count">
                  Reports: {report.post.num_reports}
              </div>
              : null}
            {showPinUI && post.text && isModerator
              ? <a onClick={() => togglePinPost(post)}>
                {post.stickied ? "unpin" : "pin"}
              </a>
              : null}
            {isModerator && removePost
              ? <a onClick={() => removePost(post)}>remove</a>
              : null}
            {isModerator && ignorePostReports
              ? <a onClick={() => ignorePostReports(post)}>
                  ignore all reports
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
