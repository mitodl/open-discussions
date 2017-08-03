// @flow
import R from "ramda"
import { GET, POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"

import type { Comment } from "../flow/discussionTypes.js"

export type CommentResponse = {
  postID: string,
  data: Array<Comment>
}

type CommentPayload = {
  commentId: string,
  postId: string,
  comment: Comment
}

const appendCommentToTree = (tree: Array<Comment>, comment: Comment, commentId?: string): Array<Comment> => {
  return commentId
    ? R.map((treeComment: Comment) => {
      return {
        ...treeComment,
        replies:
            treeComment.id === commentId
              ? [...treeComment.replies, comment]
              : appendCommentToTree(treeComment.replies, comment, commentId)
      }
    }, tree)
    : R.prepend(comment, tree)
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
  postFunc: async (postId: string, text: string, commentId: ?string) => {
    const comment = await api.createComment(postId, text, commentId)
    return { postId, commentId, comment }
  },
  postSuccessHandler: ({ commentId, postId, comment }: CommentPayload, data: Map<string, Array<Comment>>) => {
    let update = new Map()
    data.forEach((tree, key) => {
      update.set(key, key === postId ? appendCommentToTree(tree, comment, commentId) : tree)
    })
    return update
  }
}
