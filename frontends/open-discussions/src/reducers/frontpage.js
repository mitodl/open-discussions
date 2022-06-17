// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"

import * as frontpageAPI from "../lib/api/frontpage"
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
  getFunc: (params: PostListPaginationParams) =>
    frontpageAPI.getFrontpage(params),
  getSuccessHandler: mapPostListResponse
}
