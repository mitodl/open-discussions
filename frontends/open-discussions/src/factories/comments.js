// @flow
import R from "ramda"
import casual from "casual-browserify"

import { arrayN } from "./util"
import { incrementer } from "../lib/util"
import { makePost } from "./posts"

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
    id:              String(nextCommentId()),
    parent_id:       parentId,
    post_id:         post.id,
    text:            casual.text,
    author_id:       casual.username,
    score:           casual.integer(-50, 100),
    upvoted:         casual.coin_flip,
    downvoted:       casual.coin_flip,
    removed:         casual.coin_flip,
    deleted:         false, // we want this the majority of the time
    created:         casual.moment.format(),
    replies:         [],
    profile_image:   casual.url,
    author_name:     casual.name,
    author_headline: casual.text,
    edited:          casual.boolean,
    comment_type:    "comment",
    num_reports:     0,
    subscribed:      casual.boolean
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
  minComments: number = 1,
  maxTopLevelComments: number = 10,
  maxMidLevelComments: number = 5
): Array<GenericComment> => {
  const topLevelComments = arrayN(minComments, maxTopLevelComments).map(() =>
    makeComment(post)
  )
  const comments = [...topLevelComments]

  topLevelComments.forEach((comment, index) => {
    if (casual.coin_flip || index === 0) {
      for (const midComment of arrayN(minComments, maxMidLevelComments).map(
        () => makeComment(post, comment.id)
      )) {
        comments.push(midComment)

        if (casual.coin_flip || index === 0) {
          for (const edgeComment of arrayN(
            minComments,
            maxMidLevelComments
          ).map(() => makeComment(post, midComment.id))) {
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

export const makeCommentsList = (): Array<CommentInTree> => {
  return R.range(0, 5).map(() => makeComment(makePost()))
}
