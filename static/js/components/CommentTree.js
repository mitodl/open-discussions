// @flow
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
    comment: Comment,
    idx: number
  ) =>
    <Card key={idx}>
      <div className="top-level-comment">
        {renderComment(forms, upvote, downvote, beginReply, 0, comment)}
      </div>
    </Card>
)

const renderComment = R.curry(
  (
    forms: FormsState,
    upvote: CommentVoteFunc,
    downvote: CommentVoteFunc,
    beginReply: (fk: string, iv: Object, e: ?Object) => void,
    depth: number,
    comment: Comment
  ) => {
    const formKey = replyToCommentKey(comment)
    const initialValue = getCommentReplyInitialValue(comment)

    return (
      <div className="comment" key={comment.id}>
        <div className="author-info">
          <a className="author-name">
            {comment.author_id}
          </a>
          <div>
            {moment(comment.created).fromNow()}
          </div>
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
          <div
            className="reply-button"
            onClick={e => {
              beginReply(formKey, initialValue, e)
            }}
          >
            <a href="#">Reply</a>
          </div>
        </div>
        <div>
          <ReplyToCommentForm forms={forms} comment={comment} />
        </div>
        <div className="replies">
          {R.map(
            renderComment(forms, upvote, downvote, beginReply, depth + 1),
            comment.replies
          )}
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
  beginReply: (fk: string, iv: Object, e: ?Object) => void
}

const CommentTree = ({
  comments,
  forms,
  upvote,
  downvote,
  beginReply
  }: CommentTreeProps) =>
  <div className="comments">
    {R.addIndex(R.map)(
      renderTopLevelComment(forms, upvote, downvote, beginReply),
      comments
    )}
  </div>

export default CommentTree
