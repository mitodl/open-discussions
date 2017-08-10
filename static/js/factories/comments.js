// @flow
import casual from "casual-browserify"

import { incrementer, arrayN } from "./util"

import type { Post, Comment } from "../flow/discussionTypes"

const incr = incrementer()

export const makeComment = (post: Post): Comment => {
  const comment = {
    id:        String(incr.next().value),
    post_id:   post.id,
    text:      casual.text,
    author_id: casual.username,
    score:     casual.integer(-50, 100),
    upvoted:   casual.coin_flip,
    downvoted: casual.coin_flip,
    created:   casual.moment.format(),
    replies:   []
  }

  if (comment.upvoted && comment.downvoted) {
    comment.downvoted = false
  }
  return comment
}

export const makeCommentTree = (post: Post, minComments: number = 1): Array<Comment> => {
  let topLevelComments = arrayN(minComments, 10).map(() => makeComment(post))

  topLevelComments.forEach((comment, index) => {
    if (casual.coin_flip || index === 0) {
      comment.replies = arrayN(minComments, 5).map(() => makeComment(post))

      comment.replies.forEach(reply => {
        if (casual.coin_flip || index === 0) {
          reply.replies = arrayN(minComments, 5).map(() => makeComment(post))
        }
      })
    }
  })

  return topLevelComments
}
