// @flow
import R from "ramda"
import { GET, PATCH, POST, INITIAL_STATE } from "redux-hammock/constants"

import { findComment } from "../lib/comments"
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

const appendCommentToTree = (
  tree: Array<Comment>,
  comment: Comment,
  commentId?: string
): Array<Comment> => {
  if (!commentId) {
    return R.prepend(comment, tree)
  }

  const lens = findComment(tree, commentId)
  if (!lens) {
    // should probably not get to this point, the original comment should still be present
    // if the API returned a message saying that the reply was successful
    return tree
  }

  let treeComment = R.view(lens, tree)
  const replies = [...treeComment.replies, comment]
  treeComment = { ...treeComment, replies }
  return R.set(lens, treeComment, tree)
}

const updateCommentTree = (
  tree: Array<Comment>,
  updatedComment: Comment
): Array<Comment> => {
  const lens = findComment(tree, updatedComment.id)
  if (lens === null) {
    return tree
  }

  const original = R.view(lens, tree)
  const replies = original.replies
  updatedComment = ({ ...updatedComment, replies }: Comment)

  return R.set(lens, updatedComment, tree)
}

export const commentsEndpoint = {
  name:              "comments",
  verbs:             [GET, PATCH, POST],
  getFunc:           (postID: string) => api.getComments(postID),
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler: (
    response: CommentResponse,
    data: Map<string, Array<Comment>>
  ): Map<string, Array<Comment>> => {
    const update = new Map(data)
    update.set(response.postID, response.data)
    return update
  },
  postFunc: async (postId: string, text: string, commentId: ?string) => {
    const comment = await api.createComment(postId, text, commentId)
    return { postId, commentId, comment }
  },
  postSuccessHandler: (
    { commentId, postId, comment }: CommentPayload,
    data: Map<string, Array<Comment>>
  ): Map<string, Array<Comment>> => {
    const update = new Map(data)
    const oldTree = data.get(postId)
    if (oldTree) {
      update.set(postId, appendCommentToTree(oldTree, comment, commentId))
    }
    return update
  },
  patchFunc: (commentId: string, payload: Object) =>
    api.updateComment(commentId, payload),
  patchSuccessHandler: (
    response: Comment,
    data: Map<string, Array<Comment>>
  ): Map<string, Array<Comment>> => {
    const update = new Map(data)
    const postId = response.post_id
    const oldTree = data.get(postId)
    if (oldTree) {
      update.set(postId, updateCommentTree(oldTree, response))
    }
    return update
  }
}
