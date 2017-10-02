// @flow
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"

import { channelURL, postDetailURL } from "../lib/url"
import { formatCommentsCount } from "../lib/posts"

import type { Post } from "../flow/discussionTypes"

const textContent = post =>
  <ReactMarkdown
    disallowedTypes={["Image"]}
    source={post.text}
    escapeHtml
    className="text-content"
  />

const postTitle = (post: Post) =>
  post.text
    ? <Link
      className="post-title"
      to={postDetailURL(post.channel_name, post.id)}
    >
      {post.title}
    </Link>
    : <a className="post-title" href={post.url} target="_blank">
      {post.title}
    </a>

class PostDisplay extends React.Component {
  props: {
    post: Post,
    showChannelLink?: boolean,
    expanded?: boolean,
    toggleUpvote: Post => void
  }

  state: {
    upvoting: boolean
  }

  constructor(props) {
    super(props)
    this.state = {
      upvoting: false
    }
  }

  showChannelLink = () => {
    const { post, showChannelLink } = this.props

    return showChannelLink && post.channel_name
      ? <span>
          in <Link to={channelURL(post.channel_name)}>{post.channel_name}</Link>
      </span>
      : null
  }

  onToggleUpvote = async () => {
    const { toggleUpvote, post } = this.props
    this.setState({
      upvoting: true
    })
    await toggleUpvote(post)
    this.setState({
      upvoting: false
    })
  }

  upvoteDisplay = () => {
    const { post, expanded } = this.props
    const { upvoting } = this.state
    const upvoted = post.upvoted !== upvoting
    const upvoteClass = upvoted ? "upvoted" : ""

    return (
      <div className={`upvotes ${upvoteClass} ${expanded ? "expanded" : ""}`}>
        <button
          className="upvote-button"
          onClick={this.onToggleUpvote}
          disabled={upvoting}
        >
          <img
            className="vote-arrow"
            src={
              upvoted
                ? "/static/images/upvote_arrow_on.png"
                : "/static/images/upvote_arrow.png"
            }
            height="16"
            width="16"
          />
        </button>
        <span className="votes">
          {post.score}
        </span>
      </div>
    )
  }

  render() {
    const { post, expanded } = this.props
    const formattedDate = moment(post.created).fromNow()
    return (
      <div className={`post-summary ${expanded ? "expanded" : ""}`}>
        {expanded ? null : this.upvoteDisplay()}
        <div className="summary">
          {expanded
            ? <img className="profile-image" src={post.profile_image} />
            : null}
          <div className="post-title">
            {postTitle(post)}
          </div>
          <div className="authored-by">
            by <a>{post.author_name}</a>, {formattedDate}{" "}
            {this.showChannelLink()}
          </div>
          <div className="num-comments">
            {expanded
              ? null
              : <Link to={postDetailURL(post.channel_name, post.id)}>
                {formatCommentsCount(post)}
              </Link>}
          </div>
        </div>
        {expanded && post.text ? textContent(post) : null}
        {expanded ? this.upvoteDisplay() : null}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  posts: state.posts
})

export default connect(mapStateToProps)(PostDisplay)
