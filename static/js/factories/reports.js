// @flow
import casual from "casual-browserify"

import { makePost } from "./posts"
import { makeComment } from "./comments"
import { randomSelection } from "./util"

import type {
  Post,
  PostReportRecord,
  CommentReportRecord
} from "../flow/discussionTypes"

const reasons = ["spam", "not good", "BAD", "RAAAAGE", "mauvais"]

export const makeCommentReport = (post: Post): CommentReportRecord => {
  const comment = makeComment(post)
  comment.num_reports = 2

  return {
    comment: comment,
    post:    null,
    reasons: randomSelection(2, reasons)
  }
}

export const makePostReport = (post: ?Post = undefined): PostReportRecord => {
  post = post || makePost()
  post.num_reports = 2

  return {
    post,
    comment: null,
    reasons: randomSelection(2, reasons)
  }
}

export const makeReportRecord = () =>
  casual.boolean ? makePostReport() : makeCommentReport(makePost())
