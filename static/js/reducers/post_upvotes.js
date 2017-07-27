// @flow
import * as api from "../lib/api"
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"

export const postUpvotesEndpoint = {
  name:         "postUpvotes",
  verbs:        [PATCH],
  patchFunc:    (id: string, upvoted: boolean) => api.updateUpvote(id, upvoted),
  initialState: { ...INITIAL_STATE }
}
