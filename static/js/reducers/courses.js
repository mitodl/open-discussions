// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"
import * as api from "../lib/api/api"

export const courseFacetsEndpoint = {
  name:              "coursefacets",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           () => api.aggregate(["topics", "platform"]),
  getSuccessHandler: (response: Object): any => {
    return {
      topics:    response.aggregations.topics.buckets.map(topic => topic.key),
      platforms: response.aggregations.platform.buckets.map(
        platform => platform.key
      )
    }
  }
}
