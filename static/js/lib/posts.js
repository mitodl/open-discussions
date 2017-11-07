// @flow
import React from "react"
import R from "ramda"
import { Link } from "react-router-dom"

import { postDetailURL, urlHostname } from "../lib/url"

import type {
  PostForm,
  Post,
  PostListData,
  PostListResponse
} from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  isText: true,
  text:   "",
  url:    "",
  title:  ""
})

export const formatCommentsCount = (post: Post): string =>
  post.num_comments === 1 ? "1 Comment" : `${post.num_comments || 0} Comments`

export const mapPostListResponse = (
  response: PostListResponse
): PostListData => ({
  pagination: response.pagination,
  postIds:    response.posts.map(post => post.id)
})

export const getPostIds = R.propOr([], "postIds")

export const getPaginationParams = R.pickAll(["count", "after", "before"])

export const formatPostTitle = (post: Post) =>
  post.text
    ? <Link
      className="post-title"
      to={postDetailURL(post.channel_name, post.id)}
    >
      {post.title}
    </Link>
    : <div>
      <a
        className="post-title"
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {post.title}
      </a>
      <span className="url-hostname">
        {`(${urlHostname(post.url)})`}
      </span>
    </div>

type PostVotingProps = {
  post: Post,
  className?: string,
  toggleUpvote: Function
}

export class PostVotingButtons extends React.Component {
  props: PostVotingProps

  state: {
    upvoting: boolean
  }

  constructor(props: PostVotingProps) {
    super(props)
    this.state = {
      upvoting: false
    }
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
    const { post, className } = this.props
    const { upvoting } = this.state
    const upvoted = post.upvoted !== upvoting
    const upvoteClass = upvoted ? "upvoted" : ""

    return (
      <div className={`upvotes ${className || ""} ${upvoteClass}`}>
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
            width="13"
          />
        </button>
        <span className="votes">
          {post.score}
        </span>
      </div>
    )
  }
}
