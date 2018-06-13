// @flow
import * as api from "../lib/api"
import { INITIAL_STATE } from "redux-hammock/constants"
import { deriveVerbFuncs } from "redux-hammock/hammock"

export const authEndpoint = {
  name:         "auth",
  initialState: { ...INITIAL_STATE },
  ...deriveVerbFuncs({
    // login functions
    loginEmail:    (email: string) => api.postEmailLogin(email),
    loginPassword: (partialToken: string, password: string) => api.postPasswordLogin(partialToken, password),
    // register functions
    registerEmail: async (email: string) => {
      const response = await api.postEmailRegister(email)
      return { response, email }
    },
    registerConfirm: (code: string) => api.postConfirmRegister(code),
    registerDetails: (
      partialToken: string,
      name: string,
      password: string,
      tos: boolean
    ) => api.postDetailsRegister(partialToken, name, password, tos)
  })
}
