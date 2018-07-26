// @flow
import { PATCH, INITIAL_STATE } from "redux-hammock/constants"
import * as api from "../lib/api"

export const profileImageEndpoint = {
  name:         "profileImage",
  verbs:        [PATCH],
  initialState: { ...INITIAL_STATE },
  patchFunc:    (username: string, blob: Blob, name: string) =>
    api.patchProfileImage(username, blob, name)
}
