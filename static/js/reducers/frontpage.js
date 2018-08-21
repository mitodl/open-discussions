// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api"
import { mapPostListResponse } from "../lib/posts"

import type { PostListPaginationParams } from "../flow/discussionTypes"

export const frontPageEndpoint = {
  name:         "frontpage",
  verbs:        [GET],
  initialState: {
    ...INITIAL_STATE,
    data: {
      pagination: null,
      postIds:    []
    }
  },
  getFunc:           (params: PostListPaginationParams) => api.getFrontpage(params),
  getSuccessHandler: mapPostListResponse
}
