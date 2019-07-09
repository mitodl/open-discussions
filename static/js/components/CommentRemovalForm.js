// @flow
import React from "react"

import { preventDefaultAndInvoke } from "../lib/util"

import type { CommentInTree } from "../flow/discussionTypes"

type CommentRemovalFormProps = {
  approve: Function,
  remove: Function,
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
      <a href="#">{comment.removed ? "Approve" : "Remove"}</a>
    </div>
  )
}

export default CommentRemovalForm
