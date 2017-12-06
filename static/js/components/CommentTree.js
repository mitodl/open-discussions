// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import moment from "moment"

import ReactMarkdown from "react-markdown"

import Card from "./Card"
import SpinnerButton from "./SpinnerButton"
import { ReplyToCommentForm, EditCommentForm } from "./CommentForms"
import CommentVoteForm from "./CommentVoteForm"

import {
  replyToCommentKey,
  editCommentKey,
  getCommentReplyInitialValue
} from "../components/CommentForms"
import { addEditedMarker } from "../lib/reddit_objects"

import type {
  GenericComment,
  CommentInTree,
  MoreCommentsInTree
} from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { CommentVoteFunc } from "./CommentVoteForm"

type LoadMoreCommentsFunc = (comment: MoreCommentsInTree) => Promise<*>
type BeginEditingFunc = (fk: string, iv: Object, e: ?Object) => void

type CommentTreeProps = {
  comments: Array<GenericComment>,
  forms: FormsState,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc,
  loadMoreComments: LoadMoreCommentsFunc,
  beginEditing: BeginEditingFunc,
  processing: boolean
}

export default class CommentTree extends React.Component<*, *> {
  props: CommentTreeProps

  renderComment = (depth: number, comment: CommentInTree) => {
    const { forms, upvote, downvote, beginEditing, processing } = this.props
    const formKey = replyToCommentKey(comment)
    const editFormKey = editCommentKey(comment)
    const initialValue = getCommentReplyInitialValue(comment)
    // ramda can't determine arity here so use curryN
    const renderGenericComment = R.curryN(2, this.renderGenericComment)(
      depth + 1
    )

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth
    return (
      <div className="comment" key={`comment-${comment.id}`}>
        <img className="profile-image" src={comment.profile_image} />
        <div className="comment-contents">
          <div className="author-info">
            <span className="author-name">
              {comment.author_name}
            </span>
            <span>
              {moment(comment.created).fromNow()}
            </span>
          </div>
          <div className="row">
            {R.has(editFormKey, forms)
              ? <EditCommentForm
                forms={forms}
                comment={comment}
                processing={processing}
                editing
              />
              : <ReactMarkdown
                disallowedTypes={["Image"]}
                source={addEditedMarker(comment)}
                escapeHtml
              />}
          </div>
          <div className="row comment-actions">
            <CommentVoteForm
              comment={comment}
              upvote={upvote}
              downvote={downvote}
            />
            {atMaxDepth
              ? null
              : <div
                className="comment-action-button"
                onClick={e => {
                  beginEditing(formKey, initialValue, e)
                }}
              >
                <a href="#">Reply</a>
              </div>}
            {SETTINGS.username === comment.author_id
              ? <div
                className="comment-action-button"
                onClick={e => {
                  beginEditing(editFormKey, comment, e)
                }}
              >
                <a href="#">Edit</a>
              </div>
              : null}
          </div>
          {atMaxDepth
            ? null
            : <div>
              <ReplyToCommentForm
                forms={forms}
                comment={comment}
                processing={processing}
              />
            </div>}
          {atMaxDepth
            ? null
            : <div className="replies">
              {R.map(renderGenericComment, comment.replies)}
            </div>}
        </div>
      </div>
    )
  }

  renderMoreComments = (comment: MoreCommentsInTree) => {
    const { loadMoreComments } = this.props
    return (
      <div
        className="more-comments"
        key={`more-comments-${comment.parent_id || "null"}`} // will be null if parent_id is null, indicating root level
      >
        <SpinnerButton
          className="load-more-comments"
          onClickPromise={() => loadMoreComments(comment)}
        >
          Load More Comments
        </SpinnerButton>
      </div>
    )
  }

  renderGenericComment = (depth: number, comment: GenericComment) => {
    if (comment.comment_type === "comment") {
      return this.renderComment(depth, comment)
    } else if (comment.comment_type === "more_comments") {
      return this.renderMoreComments(comment)
    } else {
      throw new Error("Unexpected comment_type")
    }
  }

  renderTopLevelComment = (comment: GenericComment, idx: number) => {
    return (
      <Card key={idx}>
        <div className="top-level-comment">
          {this.renderGenericComment(0, comment)}
        </div>
      </Card>
    )
  }

  render() {
    const { comments } = this.props
    return (
      <div className="comments">
        {R.addIndex(R.map)(this.renderTopLevelComment, comments)}
      </div>
    )
  }
}
