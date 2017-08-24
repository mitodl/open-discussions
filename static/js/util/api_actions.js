// @flow
import R from "ramda"

import { actions } from "../actions"
import { setPostData } from "../actions/post"

import type { Post } from "../flow/discussionTypes"
import type { Dispatch } from "redux"

export const toggleUpvote = R.curry(async (dispatch: Dispatch, post: Post) => {
  const result = await dispatch(
    actions.postUpvotes.patch(post.id, !post.upvoted)
  )
  return dispatch(setPostData(result))
})
