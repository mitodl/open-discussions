// @flow
import * as api from "../lib/api"
import { POST, INITIAL_STATE } from "redux-hammock/constants"

export const loginEmailEndpoint = {
  name:         "loginEmail",
  verbs:        [POST],
  postFunc:     (email: string) => api.postEmailLogin(email),
  initialState: { ...INITIAL_STATE }
}

export const loginPasswordEndpoint = {
  name:     "loginPassword",
  verbs:    [POST],
  postFunc: (partialToken: string, password: string) =>
    api.postPasswordLogin(partialToken, password),
  initialState: { ...INITIAL_STATE }
}
