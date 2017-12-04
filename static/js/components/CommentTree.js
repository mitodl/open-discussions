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

const renderTopLevelComment = R.curry(
  (
    forms: FormsState,
    upvote: CommentVoteFunc,
    downvote: CommentVoteFunc,
    loadMoreComments: LoadMoreCommentsFunc,
    beginEditing: BeginEditingFunc,
    processing: boolean,
    comment: GenericComment,
    idx: number
  ) =>
    <Card key={idx}>
      <div className="top-level-comment">
        {renderGenericComment(
          forms,
          upvote,
          downvote,
          loadMoreComments,
          beginEditing,
          processing,
          0,
          comment
        )}
      </div>
    </Card>
)

const renderGenericComment = R.curry(
  (
    forms: FormsState,
    upvote: CommentVoteFunc,
    downvote: CommentVoteFunc,
    loadMoreComments: LoadMoreCommentsFunc,
    beginEditing: BeginEditingFunc,
    processing: boolean,
    depth: number,
    comment: GenericComment
  ) => {
    if (comment.comment_type === "comment") {
      return renderComment(
        forms,
        upvote,
        downvote,
        loadMoreComments,
        beginEditing,
        processing,
        depth,
        comment
      )
    } else if (comment.comment_type === "more_comments") {
      return renderMoreComments(loadMoreComments, comment)
    } else {
      throw new Error("Unexpected comment_type")
    }
  }
)

const renderComment = (
  forms: FormsState,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc,
  loadMoreComments: LoadMoreCommentsFunc,
  beginEditing: BeginEditingFunc,
  processing: boolean,
  depth: number,
  comment: CommentInTree
) => {
  const formKey = replyToCommentKey(comment)
  const editFormKey = editCommentKey(comment)
  const initialValue = getCommentReplyInitialValue(comment)

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
            {R.map(
              renderGenericComment(
                forms,
                upvote,
                downvote,
                loadMoreComments,
                beginEditing,
                processing,
                depth + 1
              ),
              comment.replies
            )}
          </div>}
      </div>
    </div>
  )
}

const renderMoreComments = (
  loadMoreComments: LoadMoreCommentsFunc,
  comment: MoreCommentsInTree
) => {
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

type CommentTreeProps = {
  comments: Array<GenericComment>,
  forms: FormsState,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc,
  loadMoreComments: LoadMoreCommentsFunc,
  beginEditing: BeginEditingFunc,
  processing: boolean
}

const CommentTree = ({
  comments,
  forms,
  upvote,
  downvote,
  loadMoreComments,
  beginEditing,
  processing
  }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(
      renderTopLevelComment(
        forms,
        upvote,
        downvote,
        loadMoreComments,
        beginEditing,
        processing
      ),
      comments
    )}
  </div>

export default CommentTree
