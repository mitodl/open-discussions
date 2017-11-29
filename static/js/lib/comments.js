// @flow
import R from "ramda"

import { enumerate } from "../lib/util"

import type { GenericComment } from "../flow/discussionTypes"

/**
 * Returns a Ramda lens to the comment or null if none is found
 */
export const findComment = (
  commentTree: Array<GenericComment>,
  commentId: string,
  parentIndexes: Array<number> = []
): Object | null => {
  for (const [index, comment] of enumerate(commentTree)) {
    if (comment.comment_type !== "comment") {
      continue
    }

    if (comment.id === commentId) {
      const path = []
      for (const parentIndex of parentIndexes) {
        path.push(parentIndex)
        path.push("replies")
      }
      path.push(index)

      return R.lensPath(path)
    }

    // parents is shared between calls but this won't cause a problem because
    // once we find the comment we can stop searching and construct the return list
    parentIndexes.push(index)
    const innerChain = findComment(comment.replies, commentId, parentIndexes)
    if (innerChain !== null) {
      return innerChain
    }
    parentIndexes.pop()
  }

  return null
}
