// @flow
import R from "ramda"

import { actions } from "../actions"
import { setPostData } from "../actions/post"
import { setSnackbarMessage } from "../actions/ui"

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

export const toggleFollowPost = R.curry(
  async (dispatch: Dispatch<*>, post: Post) => {
    const newSubscribedValue = !post.subscribed
    await dispatch(
      actions.posts.patch(post.id, { subscribed: newSubscribedValue })
    )
    const message = newSubscribedValue
      ? "We will notify you when someone comments on this post."
      : "We will no longer send you notifications when someone comments on this post."
    return dispatch(setSnackbarMessage({ message }))
  }
)

export const toggleFollowComment = R.curry(
  async (dispatch: Dispatch<*>, comment: CommentInTree) => {
    const newSubscribedValue = !comment.subscribed
    await dispatch(
      actions.comments.patch(comment.id, { subscribed: newSubscribedValue })
    )
    const message = newSubscribedValue
      ? "We will notify you when someone replies to this comment."
      : "We will no longer send you notifications when someone replies to this comment."
    return dispatch(setSnackbarMessage({ message }))
  }
)

export const leaveChannel = async (
  dispatch: Dispatch<*>,
  channelName: string,
  username: string
) => {
  await dispatch(actions.channelSubscribers.delete(channelName, username))
  await dispatch(actions.channelContributors.delete(channelName, username))
}
