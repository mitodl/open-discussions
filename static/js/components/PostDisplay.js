// @flow
import React from "react"
import moment from "moment"
import { connect } from "react-redux"
import { Link } from "react-router-dom"

import { channelURL, postDetailURL } from "../lib/url"

import type { Post } from "../flow/discussionTypes"

const textContent = post =>
  <div className="text-content">
    {post.text}
  </div>

const postTitle = (post: Post) =>
  post.text
    ? <Link className="post-title" to={postDetailURL(post.channel_name, post.id)}>
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
      ? <Link to={channelURL(post.channel_name)}>
          on {post.channel_name}
      </Link>
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

  render() {
    const { post, expanded } = this.props
    const { upvoting } = this.state
    const formattedDate = moment(post.created).fromNow()
    const upvoteClass = post.upvoted ? "upvoted" : ""
    return (
      <div className="post-summary">
        <div className={`upvotes ${upvoteClass}`}>
          <button className="upvote-button" onClick={this.onToggleUpvote} disabled={upvoting}>
            {" "}&uArr;
          </button>
          <span className="votes">
            {post.score}
          </span>
        </div>
        <div className="summary">
          <div className="post-title">
            {postTitle(post)}
          </div>
          <div className="authored-by">
            <a>{post.author_id || "someone"}</a>, {formattedDate} {this.showChannelLink()}
          </div>
          <div className="num-comments">
            <Link to={postDetailURL(post.channel_name, post.id)}>
              {post.num_comments || 0} Comments
            </Link>
          </div>
        </div>
        {expanded && post.text ? textContent(post) : null}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  posts: state.posts
})

export default connect(mapStateToProps)(PostDisplay)
