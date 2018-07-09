// @flow
import * as api from "../lib/api"
import { INITIAL_STATE } from "redux-hammock/constants"
import { deriveVerbFuncs } from "redux-hammock/hammock"

export const passwordResetEndpoint = {
  name:         "passwordReset",
  initialState: { ...INITIAL_STATE },
  ...deriveVerbFuncs({
    postEmail:       (email: string) => api.postPasswordResetEmail(email),
    postNewPassword: (
      newPassword: string,
      reNewPassword: string,
      token: string,
      uid: string
    ) =>
      api.postPasswordResetNewPassword(newPassword, reNewPassword, token, uid)
  })
}
