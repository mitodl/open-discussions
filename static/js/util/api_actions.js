// @flow
import R from "ramda"

import { actions } from "../actions"
import { setPostData } from "../actions/post"

import type { Post, CommentInTree } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

export const toggleUpvote = R.curry(
  async (dispatch: Dispatch<*>, post: Post) => {
    const result = await dispatch(
      actions.postUpvotes.patch(post.id, !post.upvoted)
    )
    return dispatch(setPostData(result))
  }
)

export const approvePost = R.curry(
  async (dispatch: Dispatch<*>, post: Post) => {
    const result = await dispatch(actions.postRemoved.patch(post.id, false))
    return dispatch(setPostData(result))
  }
)

export const removePost = R.curry(async (dispatch: Dispatch<*>, post: Post) => {
  const result = await dispatch(actions.postRemoved.patch(post.id, true))
  return dispatch(setPostData(result))
})

export const approveComment = R.curry(
  async (dispatch: Dispatch<*>, comment: CommentInTree) =>
    dispatch(
      actions.comments.patch(comment.id, {
        removed: false
      })
    )
)

export const removeComment = R.curry(
  async (dispatch: Dispatch<*>, comment: CommentInTree) =>
    dispatch(
      actions.comments.patch(comment.id, {
        removed: true
      })
    )
)

export const toggleFollowPost = R.curry((dispatch: Dispatch<*>, post: Post) =>
  dispatch(actions.posts.patch(post.id, { subscribed: !post.subscribed }))
)

export const toggleFollowComment = R.curry(
  (dispatch: Dispatch<*>, comment: CommentInTree) =>
    dispatch(
      actions.comments.patch(comment.id, { subscribed: !comment.subscribed })
    )
)
