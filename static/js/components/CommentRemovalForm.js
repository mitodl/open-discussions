// @flow
import React from "react"

import { preventDefaultAndInvoke } from "../lib/util"

import type { CommentInTree } from "../flow/discussionTypes"

export type CommentRemoveFunc = CommentInTree => void

type CommentRemovalFormProps = {
  approve: CommentRemoveFunc,
  remove: CommentRemoveFunc,
  isModerator: boolean,
  comment: CommentInTree
}

const CommentRemovalForm = ({
  approve,
  remove,
  isModerator,
  comment
}: CommentRemovalFormProps) => {
  if (!isModerator) {
    return null
  }

  const commentAction = comment.removed ? approve : remove

  return (
    <div
      className={`comment-action-button ${
        comment.removed ? "approve" : "remove"
      }-button`}
      onClick={preventDefaultAndInvoke(() => commentAction(comment))}
    >
      <a href="#">{comment.removed ? "Approve content" : "Remove content"}</a>
    </div>
  )
}

export default CommentRemovalForm
