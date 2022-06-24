// @flow
import R from "ramda"
import qs from "query-string"
import { PATCH, POST, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"
import { getCommentSortQS } from "./util"

import type {
  GenericComment,
  CommentFromAPI,
  MoreCommentsFromAPI
} from "../../flow/discussionTypes"

export function getComments(
  postID: string,
  params: Object
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> {
  return fetchJSONWithAuthFailure(
    `/api/v0/posts/${postID}/comments/${getCommentSortQS(params)}`
  )
}

export const getComment = (
  commentID: string
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> =>
  fetchJSONWithAuthFailure(`/api/v0/comments/${commentID}`)

export const createComment = (
  postId: string,
  text: string,
  commentId: ?string
): Promise<CommentFromAPI> => {
  const body =
    commentId === undefined ? { text } : { text, comment_id: commentId }

  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/comments/`, {
    method: POST,
    body:   JSON.stringify(body)
  })
}

export function updateComment(
  commentId: string,
  commentPayload: Object
): Promise<GenericComment> {
  return fetchJSONWithAuthFailure(`/api/v0/comments/${commentId}/`, {
    method: PATCH,
    body:   JSON.stringify(commentPayload)
  })
}

export function deleteComment(commentId: string): Promise<GenericComment> {
  return fetchWithAuthFailure(`/api/v0/comments/${commentId}/`, {
    method: DELETE
  })
}

export function getMoreComments(
  postId: string,
  parentId: string | null,
  children: Array<string>
): Promise<Array<CommentFromAPI | MoreCommentsFromAPI>> {
  const payload = {
    post_id:  postId,
    children: children
  }
  if (!R.isNil(parentId)) {
    // $FlowFixMe: Flow doesn't know that we're still constructing payload
    payload.parent_id = parentId
  }
  return fetchJSONWithAuthFailure(
    `/api/v0/morecomments/?${qs.stringify(payload)}`
  )
}
