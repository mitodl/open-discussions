// @flow
import { GET, POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"

import type { Comment } from "../flow/discussionTypes.js"

export type CommentResponse = {
  postID: string,
  data: Array<Comment>
}

export const commentsEndpoint = {
  name:              "comments",
  verbs:             [GET, POST],
  getFunc:           (postID: string) => api.getComments(postID),
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler: (response: CommentResponse, data: Map<string, Array<Comment>>) => {
    let update = new Map(data)
    update.set(response.postID, response.data)
    return update
  },
  postFunc: (postID: string, comment: string, commentId: ?string) => {
    return api.createComment(postID, comment, commentId)
  },
  postSuccessHandler: (payload: Comment, data: Map<string, Comment>) => {
    return new Map(data)
  }
}
