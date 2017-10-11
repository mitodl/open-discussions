// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import moment from "moment"

import ReactMarkdown from "react-markdown"

import Card from "./Card"
import { ReplyToCommentForm } from "./CreateCommentForm"
import CommentVoteForm from "./CommentVoteForm"

import {
  replyToCommentKey,
  getCommentReplyInitialValue
} from "../components/CreateCommentForm"

import type { Comment } from "../flow/discussionTypes"
import type { FormsState } from "../flow/formTypes"
import type { CommentVoteFunc } from "./CommentVoteForm"

const renderTopLevelComment = R.curry(
  (
    forms: FormsState,
    upvote: CommentVoteFunc,
    downvote: CommentVoteFunc,
    beginReply,
    processing: boolean,
    comment: Comment,
    idx: number
  ) =>
    <Card key={idx}>
      <div className="top-level-comment">
        {renderComment(
          forms,
          upvote,
          downvote,
          beginReply,
          processing,
          0,
          comment
        )}
      </div>
    </Card>
)

const renderComment = R.curry(
  (
    forms: FormsState,
    upvote: CommentVoteFunc,
    downvote: CommentVoteFunc,
    beginReply: (fk: string, iv: Object, e: ?Object) => void,
    processing: boolean,
    depth: number,
    comment: Comment
  ) => {
    const formKey = replyToCommentKey(comment)
    const initialValue = getCommentReplyInitialValue(comment)

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth
    return (
      <div className="comment" key={comment.id}>
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
            <ReactMarkdown
              disallowedTypes={["Image"]}
              source={comment.text}
              escapeHtml
            />
          </div>
          <div className="row vote-reply">
            <CommentVoteForm
              comment={comment}
              upvote={upvote}
              downvote={downvote}
            />
            {atMaxDepth
              ? null
              : <div
                className="reply-button"
                onClick={e => {
                  beginReply(formKey, initialValue, e)
                }}
              >
                <a href="#">Reply</a>
              </div>}
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
                renderComment(
                  forms,
                  upvote,
                  downvote,
                  beginReply,
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
)

type CommentTreeProps = {
  comments: Array<Comment>,
  forms: FormsState,
  upvote: CommentVoteFunc,
  downvote: CommentVoteFunc,
  beginReply: (fk: string, iv: Object, e: ?Object) => void,
  processing: boolean
}

const CommentTree = ({
  comments,
  forms,
  upvote,
  downvote,
  beginReply,
  processing
  }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(
      renderTopLevelComment(forms, upvote, downvote, beginReply, processing),
      comments
    )}
  </div>

export default CommentTree
