// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"
import type { Post } from "../flow/discussionTypes"

type ChannelEndpointResponse = {
  channelName: string,
  posts: Array<Post>
}

export const postsForChannelEndpoint = {
  name:    "postsForChannel",
  verbs:   [GET],
  getFunc: async (channelName: string) => {
    const posts = await api.getPostsForChannel(channelName)
    return { channelName, posts }
  },
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler: (payload: ChannelEndpointResponse, data: Map<string, Array<string>>) => {
    const { channelName, posts } = payload
    let update = new Map(data)
    update.set(channelName, posts.map(post => post.id))
    return update
  }
}
