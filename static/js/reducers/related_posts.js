// @flow
import { POST, INITIAL_STATE } from "redux-hammock/constants"

import * as api from "../lib/api/api"

export const relatedPostsEndpoint = {
  name:               "relatedPosts",
  verbs:              [POST],
  initialState:       { ...INITIAL_STATE },
  postFunc:           (postId: string): Promise<Object> => api.getRelatedPosts(postId),
  postSuccessHandler: (response: Object) => {
    return response.hits.hits.map(item => item._source)
  }
}
