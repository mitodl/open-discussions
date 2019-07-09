// @flow
/* global SETTINGS: false */
import React from "react"

import SpinnerButton from "./SpinnerButton"
import Comment from "./Comment"

import type {
  GenericComment,
  CommentInTree,
  MoreCommentsInTree,
  Post
} from "../flow/discussionTypes"

type LoadMoreCommentsFunc = (comment: MoreCommentsInTree) => Promise<*>

type Props = {
  comments: Array<GenericComment>,
  loadMoreComments?: LoadMoreCommentsFunc,
  isModerator: boolean,
  isPrivateChannel: boolean,
  processing?: boolean,
  commentPermalink: (commentID: string) => string,
  moderationUI?: boolean,
  ignoreCommentReports?: (c: CommentInTree) => void,
  useSearchPageUI?: boolean,
  post?: Post
}

export default class CommentTree extends React.Component<Props> {
  renderComment = (depth: number, comment: CommentInTree) => {
    const { commentPermalink, post, isPrivateChannel, isModerator } = this.props

    const atMaxDepth = depth + 1 >= SETTINGS.max_comment_depth

    return (
      <Comment
        comment={comment}
        post={post}
        atMaxDepth={atMaxDepth}
        commentPermalink={commentPermalink}
        isPrivateChannel={isPrivateChannel}
        isModerator={isModerator}
        key={`comment-${comment.id}`}
      >
        {atMaxDepth ? null : (
          <div className="replies">
            {(comment.replies ?? []).map(comment =>
              this.renderGenericComment(depth + 1, comment)
            )}
          </div>
        )}
      </Comment>
    )
  }

  renderMoreComments = (comment: MoreCommentsInTree) => {
    const { loadMoreComments } = this.props
    return loadMoreComments ? (
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
    ) : null
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
      <div className="top-level-comment" key={idx}>
        {this.renderGenericComment(0, comment)}
      </div>
    )
  }

  render() {
    const { comments } = this.props
    return (
      <div className="comments">{comments.map(this.renderTopLevelComment)}</div>
    )
  }
}
