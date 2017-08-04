// @flow
import type { Comment } from "../flow/discussionTypes"

export const findComment = (commentState: Map<string, Array<Comment>>, commentId: string): Comment => {
  for (const commentTree of commentState.values()) {
    const comment = _findComment(commentTree, commentId)
    if (comment) {
      return comment
    }
  }

  throw new Error(`Unable to find comment ${commentId}`)
}

const _findComment = (commentTree: Array<Comment>, commentId: string): Comment | null => {
  for (const comment of commentTree) {
    if (comment.id === commentId) {
      return comment
    }

    const innerComment = _findComment(comment.replies, commentId)
    if (innerComment) {
      return innerComment
    }
  }

  return null
}
