// @flow
import R from "ramda"
import { GET, PATCH, POST, INITIAL_STATE } from "redux-hammock/constants"

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

const updateCommentTree = (tree: Array<Comment>, updatedComment: Comment): Array<Comment> => {
  return R.map((treeComment: Comment) => {
    return updatedComment.id === treeComment.id
      ? {
        ...updatedComment,
        replies: treeComment.replies
      }
      : {
        ...treeComment,
        replies: updateCommentTree(treeComment.replies, updatedComment)
      }
  }, tree)
}

export const commentsEndpoint = {
  name:              "comments",
  verbs:             [GET, PATCH, POST],
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
  },
  patchFunc:           (commentId: string, payload: Object) => api.updateComment(commentId, payload),
  patchSuccessHandler: (response: Comment, data: Map<string, Array<Comment>>) => {
    let update = new Map()
    data.forEach((tree, key) => {
      update.set(key, key === response.post_id ? updateCommentTree(tree, response) : tree)
    })
    return update
  }
}
