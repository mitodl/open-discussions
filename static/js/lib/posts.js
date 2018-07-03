// @flow
import React from "react"
import R from "ramda"
import { Link } from "react-router-dom"
import ReactTooltip from "react-tooltip"

import { postDetailURL, urlHostname } from "./url"
import { userIsAnonymous, votingTooltipText } from "./util"

import type {
  PostForm,
  Post,
  PostListData,
  PostListResponse
} from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  postType: null,
  text:     "",
  url:      "",
  title:    ""
})

export const formatCommentsCount = (post: Post): string =>
  post.num_comments === 1 ? "1 comment" : `${post.num_comments || 0} comments`

export const mapPostListResponse = (
  response: PostListResponse
): PostListData => ({
  pagination: response.pagination,
  postIds:    response.posts.map(post => post.id)
})

export const getPostIds = R.propOr([], "postIds")

export const getPaginationSortParams = R.pickAll([
  "count",
  "after",
  "before",
  "sort"
])

export const PostTitleAndHostname = ({ post }: { post: Post }) => (
  <React.Fragment>
    <span className="post-title">{post.title}</span>
    {post.url ? (
      <span className="url-hostname">{`(${urlHostname(post.url)})`}</span>
    ) : null}
  </React.Fragment>
)

export const getPostDropdownMenuKey = (post: Post) => `POST_DROPDOWN_${post.id}`

export const formatPostTitle = (post: Post) =>
  post.text ? (
    <Link className="post-title" to={postDetailURL(post.channel_name, post.id)}>
      {post.title}
    </Link>
  ) : (
    <div>
      <a
        className="post-title"
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {post.title}
      </a>
      <span className="url-hostname">{`(${urlHostname(post.url)})`}</span>
    </div>
  )

type PostVotingProps = {
  post: Post,
  className?: string,
  toggleUpvote: Function
}

export class PostVotingButtons extends React.Component<*, *> {
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
        {userIsAnonymous() ? (
          <ReactTooltip id="post-upvote-button">
            {votingTooltipText}
          </ReactTooltip>
        ) : null}
        <button
          className="upvote-button"
          onClick={userIsAnonymous() ? null : this.onToggleUpvote}
          disabled={upvoting}
          data-tip
          data-for="post-upvote-button"
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
        <span className="votes">{post.score}</span>
      </div>
    )
  }
}
