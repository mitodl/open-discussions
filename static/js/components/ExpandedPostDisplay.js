// @flow
/* global SETTINGS: false */
import React from "react"
import moment from "moment"
import ReactMarkdown from "react-markdown"
import R from "ramda"

import { EditPostForm } from "../components/CommentForms"

import { formatPostTitle, PostVotingButtons } from "../lib/posts"
import { addEditedMarker } from "../lib/reddit_objects"
import { editPostKey } from "../components/CommentForms"

import type { Post } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"

const textContent = post =>
  <ReactMarkdown
    disallowedTypes={["Image"]}
    source={addEditedMarker(post)}
    escapeHtml
    className="text-content"
  />

export default class ExpandedPostDisplay extends React.Component<*, void> {
  props: {
    post: Post,
    toggleUpvote: Post => void,
    forms: FormsState,
    beginEditing: (key: string, initialValue: Object, e: ?Event) => void
  }

  renderTextContent = () => {
    const { forms, post } = this.props

    return R.has(editPostKey(post), forms)
      ? <EditPostForm post={post} editing />
      : textContent(post)
  }

  postActionButtons = () => {
    const { toggleUpvote, post, beginEditing } = this.props

    return (
      <div className="post-actions">
        <PostVotingButtons
          post={post}
          className="expanded"
          toggleUpvote={toggleUpvote}
        />
        {SETTINGS.username === post.author_id && post.text
          ? <div
            className="comment-action-button"
            onClick={beginEditing(editPostKey(post), post)}
          >
            <a href="#">edit</a>
          </div>
          : null}
      </div>
    )
  }

  render() {
    const { post, forms } = this.props
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
        {post.text ? this.renderTextContent() : null}
        {R.has(editPostKey(post), forms) ? null : this.postActionButtons()}
      </div>
    )
  }
}
