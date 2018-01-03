// @flow
import * as api from "../lib/api"
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"

export const postRemovedEndpoint = {
  name:         "postRemoved",
  verbs:        [PATCH],
  patchFunc:    (id: string, removed: boolean) => api.updateRemoved(id, removed),
  initialState: { ...INITIAL_STATE }
}
