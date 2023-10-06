// @flow
import * as api from "../lib/api/api"
import { INITIAL_STATE, POST } from "redux-hammock/constants"

export const passwordChangeRequestEndpoint = {
  name:         "passwordChangeRequest",
  verbs:        [POST],
  initialState: { ...INITIAL_STATE },
  postFunc:     () => api.postPasswordChangeRequest()
}
