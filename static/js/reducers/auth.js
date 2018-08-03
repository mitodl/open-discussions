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
export const STATE_LOGIN_PROVIDER = "login/provider"

export const STATE_REGISTER_EMAIL = "register/email"
export const STATE_REGISTER_CONFIRM_SENT = "register/confirm-sent"
export const STATE_REGISTER_CONFIRM = "register/confirm"
export const STATE_REGISTER_DETAILS = "register/details"

export const getAuthPartialTokenSelector = R.path([
  "auth",
  "data",
  "partial_token"
])
export const getAuthFlowSelector = R.path(["auth", "data", "flow"])
export const getAuthStateSelector = R.path(["auth", "data", "state"])
export const getAuthProviderSelector = R.path(["auth", "data", "provider"])
export const getAuthEmailSelector = R.path(["auth", "data", "email"])
export const getFormErrorSelector = R.compose(
  R.head,
  R.pathOr([], ["auth", "data", "errors"])
)
export const isLoginFlow = R.pathEq(["auth", "data", "flow"], FLOW_LOGIN)
export const isProcessing = R.path(["auth", "processing"])

export const isPasswordLogin = R.compose(
  R.equals(STATE_LOGIN_PASSWORD),
  getAuthStateSelector
)

export const authEndpoint = {
  name:         "auth",
  initialState: { ...INITIAL_STATE },
  ...deriveVerbFuncs({
    // login functions
    loginEmail: async (flow: AuthFlow, email: string) => {
      const response = await api.postEmailLogin(flow, email)
      return { email, ...response }
    },
    loginPassword: (flow: AuthFlow, partialToken: string, password: string) =>
      api.postPasswordLogin(flow, partialToken, password),
    // register functions
    registerEmail: async (
      flow: AuthFlow,
      email: string,
      partialToken: string
    ) => {
      const response = await api.postEmailRegister(flow, email, partialToken)
      return { email, ...response }
    },
    registerConfirm: (flow: AuthFlow, partialToken: string, code: string) =>
      api.postConfirmRegister(flow, partialToken, code),
    registerDetails: (
      flow: AuthFlow,
      partialToken: string,
      name: string,
      password: string
    ) => api.postDetailsRegister(flow, partialToken, name, password)
  })
}
