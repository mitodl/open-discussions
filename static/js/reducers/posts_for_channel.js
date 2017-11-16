// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"
import { mapPostListResponse } from "../lib/posts"

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
    update.set(channelName, mapPostListResponse(response))
    return update
  }
}
