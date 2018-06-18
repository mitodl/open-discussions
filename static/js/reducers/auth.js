// @flow
import R from "ramda"
import * as api from "../lib/api"
import { INITIAL_STATE } from "redux-hammock/constants"
import { deriveVerbFuncs } from "redux-hammock/hammock"

import type { AuthFlow } from "../flow/authTypes"

export const FLOW_REGISTER = "register"
export const FLOW_LOGIN = "login"

export const STATE_ERROR = "error"
export const STATE_SUCCESS = "success"
export const STATE_INACTIVE = "inactive"
export const STATE_INVALID_EMAIL = "invalid-email"

export const STATE_LOGIN_EMAIL = "login/email"
export const STATE_LOGIN_PASSWORD = "login/password"
export const STATE_LOGIN_MICROMASTERS = "login/micromasters"

export const STATE_REGISTER_EMAIL = "register/email"
export const STATE_REGISTER_CONFIRM_SENT = "register/confirm-sent"
export const STATE_REGISTER_CONFIRM = "register/confirm"
export const STATE_REGISTER_DETAILS = "register/details"

export const getPartialTokenSelector = R.path(["auth", "data", "partial_token"])
export const getAuthFlowSelector = R.path(["auth", "data", "flow"])
export const getAuthStateSelector = R.path(["auth", "data", "state"])

export const isPasswordLogin = R.compose(
  R.equals(STATE_LOGIN_PASSWORD),
  getAuthStateSelector
)

export const authEndpoint = {
  name:         "auth",
  initialState: { ...INITIAL_STATE },
  ...deriveVerbFuncs({
    // login functions
    loginEmail: (flow: AuthFlow, email: string) =>
      api.postEmailLogin(flow, email),
    loginPassword: (flow: AuthFlow, partialToken: string, password: string) =>
      api.postPasswordLogin(flow, partialToken, password),
    // register functions
    registerEmail: async (flow: AuthFlow, email: string) => {
      const response = await api.postEmailRegister(flow, email)
      return { email, ...response }
    },
    registerConfirm: (flow: AuthFlow, code: string) =>
      api.postConfirmRegister(flow, code),
    registerDetails: (
      flow: AuthFlow,
      partialToken: string,
      name: string,
      password: string
    ) => api.postDetailsRegister(flow, partialToken, name, password)
  })
}
