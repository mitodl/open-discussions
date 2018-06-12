// @flow
import * as api from "../lib/api"
import { POST, INITIAL_STATE } from "redux-hammock/constants"

export const registerEmailEndpoint = {
  name:     "registerEmail",
  verbs:    [POST],
  postFunc: async (email: string) => {
    const response = await api.postEmailRegister(email)
    return { response, email }
  },
  initialState: { ...INITIAL_STATE }
}

export const registerConfirmEndpoint = {
  name:         "registerConfirm",
  verbs:        [POST],
  postFunc:     (code: string) => api.postConfirmRegister(code),
  initialState: { ...INITIAL_STATE }
}

export const registerDetailsEndpoint = {
  name:     "registerDetails",
  verbs:    [POST],
  postFunc: (
    partialToken: string,
    name: string,
    password: string,
    tos: boolean
  ) => api.postDetailsRegister(partialToken, name, password, tos),
  initialState: { ...INITIAL_STATE }
}
