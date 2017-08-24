// @flow
import * as api from "../lib/api"
import { GET, POST, INITIAL_STATE } from "redux-hammock/constants"

import { SET_POST_DATA } from "../actions/post"

import type { CreatePostPayload, Post } from "../flow/discussionTypes"

const mergePostData = (
  post: Post,
  data: Map<string, Post>
): Map<string, Post> => {
  let update = new Map(data)
  update.set(post.id, post)
  return update
}

const mergeMultiplePosts = (
  posts: Array<Post>,
  data: Map<string, Post>
): Map<string, Post> => {
  let update = new Map(data)
  posts.forEach(post => {
    update.set(post.id, post)
  })
  return update
}

export const postsEndpoint = {
  name:     "posts",
  verbs:    [GET, POST],
  getFunc:  (id: string) => api.getPost(id),
  postFunc: (name: string, payload: CreatePostPayload) =>
    api.createPost(name, payload),
  postSuccessHandler: mergePostData,
  initialState:       { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler:  mergePostData,
  extraActions:       {
    [SET_POST_DATA]: (state, action) => {
      let update =
        action.payload instanceof Array
          ? mergeMultiplePosts(action.payload, state.data)
          : mergePostData(action.payload, state.data)
      return Object.assign({}, state, { data: update, loaded: true })
    }
  }
}
