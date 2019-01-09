// @flow
import * as postAPI from "../lib/api/posts"
import {
  GET,
  POST,
  PATCH,
  DELETE,
  INITIAL_STATE
} from "redux-hammock/constants"
import R from "ramda"

import { SET_POST_DATA, CLEAR_POST_ERROR } from "../actions/post"

import type { CreatePostPayload, Post } from "../flow/discussionTypes"

const mergePostData = (
  post: Post,
  data: Map<string, Post>
): Map<string, Post> => {
  const update = new Map(data)
  update.set(post.id, post)
  return update
}

const mergeMultiplePosts = (
  posts: Array<Post>,
  data: Map<string, Post>
): Map<string, Post> => {
  const update = new Map(data)
  posts.forEach(post => {
    update.set(post.id, post)
  })
  return update
}

export const postsEndpoint = {
  name:     "posts",
  verbs:    [GET, POST, PATCH, DELETE],
  getFunc:  (id: string) => postAPI.getPost(id),
  postFunc: (name: string, payload: CreatePostPayload) =>
    postAPI.createPost(name, payload),
  patchFunc:            (id: string, post: Post) => postAPI.editPost(id, post),
  deleteFunc:           (id: string) => postAPI.deletePost(id),
  postSuccessHandler:   mergePostData,
  initialState:         { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler:    mergePostData,
  patchSuccessHandler:  mergePostData,
  deleteSuccessHandler: (_: any, data: Map<string, Post>) => data,
  extraActions:         {
    [SET_POST_DATA]: (state, action) => {
      const update =
        action.payload instanceof Array
          ? mergeMultiplePosts(action.payload, state.data)
          : mergePostData(action.payload, state.data)
      return Object.assign({}, state, { data: update, loaded: true })
    },
    [CLEAR_POST_ERROR]: R.dissoc("error")
  }
}
