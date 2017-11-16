// @flow
import casual from "casual-browserify"

import { incrementer, arrayN } from "./util"

import type {
  Post,
  CommentInTree,
  GenericComment,
  MoreCommentsInTree
} from "../flow/discussionTypes"

const incr = incrementer()
// $FlowFixMe: can't prove that value is always defined
const nextCommentId = (): string => `comment_${incr.next().value}`

export const makeComment = (
  post: Post,
  parentId: ?string = null
): CommentInTree => {
  const comment: CommentInTree = {
    id:            String(nextCommentId()),
    parent_id:     parentId,
    post_id:       post.id,
    text:          casual.text,
    author_id:     casual.username,
    score:         casual.integer(-50, 100),
    upvoted:       casual.coin_flip,
    downvoted:     casual.coin_flip,
    created:       casual.moment.format(),
    replies:       [],
    profile_image: casual.url,
    author_name:   casual.name,
    edited:        casual.boolean,
    comment_type:  "comment",
  }

  if (comment.upvoted && comment.downvoted) {
    comment.downvoted = false
  }
  return comment
}

export const makeMoreComments = (
  post: Post,
  parentId: string
): MoreCommentsInTree => ({
  parent_id:    parentId,
  post_id:      post.id,
  children:     arrayN(2, 5).map(() => nextCommentId()),
  comment_type: "more_comments"
})

export const makeCommentsResponse = (
  post: Post,
  minComments: number = 1
): Array<GenericComment> => {
  const topLevelComments = arrayN(minComments, 10).map(() => makeComment(post))
  const comments = [...topLevelComments]

  topLevelComments.forEach((comment, index) => {
    if (casual.coin_flip || index === 0) {
      for (const midComment of arrayN(minComments, 5).map(() =>
        makeComment(post, comment.id)
      )) {
        comments.push(midComment)

        if (casual.coin_flip || index === 0) {
          for (const edgeComment of arrayN(minComments, 5).map(() =>
            makeComment(post, midComment.id)
          )) {
            comments.push(edgeComment)
          }
        }
      }
    }
  })

  return comments
}

export const makeMoreCommentsResponse = (
  post: Post,
  parentId: ?string,
  minComments: number = 1,
  withMoreComments: boolean = true
): Array<GenericComment> => {
  const topLevelComments = arrayN(minComments, 3).map(() =>
    makeComment(post, parentId)
  )
  const comments = [...topLevelComments]

  topLevelComments.forEach((comment, index) => {
    if (casual.coin_flip || index === 0) {
      for (const midComment of arrayN(minComments, 5).map(() =>
        makeComment(post, comment.id)
      )) {
        comments.push(midComment)
      }
    }

    if (withMoreComments) {
      comments.push(makeMoreComments(post, comment.id))
    }
  })

  if (withMoreComments) {
    comments.push(makeMoreComments(post, comments[0].parent_id))
  }

  return comments
}
