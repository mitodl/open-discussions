// @flow
import * as postAPI from "../lib/api/posts"
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"

export const postRemovedEndpoint = {
  name:      "postRemoved",
  verbs:     [PATCH],
  patchFunc: (id: string, removed: boolean) =>
    postAPI.updateRemoved(id, removed),
  initialState: { ...INITIAL_STATE }
}
