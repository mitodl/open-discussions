// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"
import { mapPostListResponse } from "../lib/posts"
import { EVICT_POSTS_FOR_CHANNEL } from "../actions/posts_for_channel"

import type {
  PostListResponse,
  PostListData,
  PostListPaginationParams
} from "../flow/discussionTypes"

type ChannelEndpointResponse = {
  channelName: string,
  response: PostListResponse
}

export const postsForChannelEndpoint = {
  name:    "postsForChannel",
  verbs:   [GET],
  getFunc: async (channelName: string, params: PostListPaginationParams) => {
    const response = await api.getPostsForChannel(channelName, params)
    return { channelName, response }
  },
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getSuccessHandler: (
    payload: ChannelEndpointResponse,
    data: Map<string, PostListData>
  ): Map<string, PostListData> => {
    const { channelName, response } = payload
    const update = new Map(data)
    const existingPosts: PostListData = update.get(channelName) || {
      pagination: null,
      postIds:    []
    }
    update.set(channelName, mapPostListResponse(response, existingPosts))
    return update
  },
  extraActions: {
    [EVICT_POSTS_FOR_CHANNEL]: (state, action: Action<string, *>) => {
      const update = new Map(state.data)
      const channelName = action.payload
      update.delete(channelName)
      return {
        ...state,
        data: update
      }
    }
  }
}
