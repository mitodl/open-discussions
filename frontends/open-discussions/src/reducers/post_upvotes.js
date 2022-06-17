// @flow
import * as postAPI from "../lib/api/posts"
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"

export const postUpvotesEndpoint = {
  name:      "postUpvotes",
  verbs:     [PATCH],
  patchFunc: (id: string, upvoted: boolean) =>
    postAPI.updateUpvote(id, upvoted),
  initialState: { ...INITIAL_STATE }
}
