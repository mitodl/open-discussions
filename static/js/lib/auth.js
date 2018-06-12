// @flow
import {
  LOGIN_URL,
  LOGIN_PASSWORD_URL,
  REGISTER_URL,
  REGISTER_CONFIRM_URL,
  REGISTER_DETAILS_URL,
  INACTIVE_USER_URL,
  FRONTPAGE_URL
} from "./url"

import type { LoginResponse, RegisterResponse } from "../flow/authTypes"

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

export const processLoginResponse = (
  history: Object,
  response: LoginResponse
) => {
  if (response.state === STATE_LOGIN_EMAIL) {
    history.push(LOGIN_URL)
  } else if (response.state === STATE_LOGIN_PASSWORD) {
    history.push(LOGIN_PASSWORD_URL)
  } else if (response.state === STATE_SUCCESS) {
    history.push(FRONTPAGE_URL)
  } else if (response.state === STATE_INACTIVE) {
    history.push(INACTIVE_USER_URL)
  }
}

export const processRegisterResponse = (
  history: Object,
  response: RegisterResponse
) => {
  debugger;
  if (response.state === STATE_REGISTER_EMAIL) {
    history.push(REGISTER_URL)
  } else if (response.state === STATE_REGISTER_CONFIRM_SENT) {
    history.push(FRONTPAGE_URL)
  } else if (response.state === STATE_REGISTER_CONFIRM) {
    history.push(REGISTER_CONFIRM_URL)
  } else if (response.state === STATE_REGISTER_DETAILS) {
    history.push(response.state === REGISTER_DETAILS_URL)
  } else if (STATE_SUCCESS) {
    history.push(FRONTPAGE_URL)
  } else if (response.state === STATE_INACTIVE) {
    history.push(INACTIVE_USER_URL)
  }
}
