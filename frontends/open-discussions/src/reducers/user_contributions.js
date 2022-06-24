// @flow
import R from "ramda"
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api/api"
import { POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE } from "../lib/constants"

import type {
  Post,
  UserFeedComment,
  PostListPaginationParams,
  UserContributionResponse
} from "../flow/discussionTypes"

type ChannelEndpointResponse = {
  username: string,
  response: UserContributionResponse
}

export type UserContributionState =
  | {
      POSTS_OBJECT_TYPE: {
        data: Array<Post>,
        pagination: Object,
        loaded: boolean
      }
    }
  | {
      COMMENTS_OBJECT_TYPE: {
        data: Array<UserFeedComment>,
        pagination: Object,
        loaded: boolean
      }
    }

type ContributionMap = Map<string, UserContributionState>

const USER_INITIAL_STATE = {
  posts: {
    data:       [],
    pagination: {},
    loaded:     false
  },
  comments: {
    data:       [],
    pagination: {},
    loaded:     false
  }
}

const getObjectKeyFromResponse = R.compose(
  R.head,
  R.intersection([POSTS_OBJECT_TYPE, COMMENTS_OBJECT_TYPE]),
  R.keys
)

export const userContributionsEndpoint = {
  name:         "userContributions",
  verbs:        [GET],
  initialState: {
    ...INITIAL_STATE,
    data: new Map()
  },
  getFunc: async (
    requestType: string,
    username: string,
    params: PostListPaginationParams
  ) => {
    const fetchFunc =
      requestType === POSTS_OBJECT_TYPE ? api.getUserPosts : api.getUserComments
    const response = await fetchFunc(username, params || {})
    return { username, response }
  },
  getSuccessHandler: (
    payload: ChannelEndpointResponse,
    oldData: ContributionMap
  ): ContributionMap => {
    const { username, response } = payload
    const usernameContributionMap = new Map(oldData)
    // Get the existing state for the user's contributions or initialize it
    const userState =
      usernameContributionMap.get(username) || R.clone(USER_INITIAL_STATE)
    // Response data will look like {posts: [...]} or {comments: [...]}. This will give us
    // that key ("posts" or "comments").
    const objectKey = getObjectKeyFromResponse(response)
    if (!objectKey) {
      return usernameContributionMap
    }
    userState[objectKey].data = userState[objectKey].data.concat(
      response[objectKey]
    )
    userState[objectKey].pagination = response.pagination
    userState[objectKey].loaded = true
    usernameContributionMap.set(username, userState)
    return usernameContributionMap
  }
}
