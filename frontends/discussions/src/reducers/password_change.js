// @flow
import * as api from "../lib/api/api"
import { INITIAL_STATE, POST } from "redux-hammock/constants"

export const passwordChangeEndpoint = {
  name:         "passwordChange",
  verbs:        [POST],
  initialState: { ...INITIAL_STATE },
  postFunc:     (currentPassword: string, newPassword: string) =>
    api.postSetPassword(currentPassword, newPassword)
}
