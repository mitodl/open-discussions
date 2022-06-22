/* global SETTINGS: false */
// @flow
import qs from "query-string"

import {
  LOGIN_URL,
  LOGIN_PASSWORD_URL,
  REGISTER_URL,
  REGISTER_CONFIRM_URL,
  REGISTER_DETAILS_URL,
  INACTIVE_USER_URL,
  FRONTPAGE_URL,
  SETTINGS_URL,
  AUTH_REQUIRED_URL,
  LOGIN_PROVIDER_URL
} from "./url"
import {
  STATE_LOGIN_EMAIL,
  STATE_LOGIN_PASSWORD,
  STATE_LOGIN_PROVIDER,
  STATE_REGISTER_EMAIL,
  STATE_REGISTER_CONFIRM_SENT,
  STATE_REGISTER_CONFIRM,
  STATE_REGISTER_DETAILS,
  STATE_SUCCESS,
  STATE_INACTIVE
} from "../reducers/auth"

import type { AuthResponse } from "../flow/authTypes"

export const generateLoginRedirectUrl = () => {
  const { pathname, search, hash } = window.location

  const next = `${pathname}${search}${hash}`
  return `${LOGIN_URL}?${qs.stringify({ next })}`
}

export const processAuthResponse = (
  history: Object,
  response: AuthResponse
) => {
  const { state } = response
  if (state === STATE_LOGIN_EMAIL) {
    history.push(LOGIN_URL)
  } else if (state === STATE_LOGIN_PASSWORD) {
    history.push(LOGIN_PASSWORD_URL)
  } else if (state === STATE_REGISTER_EMAIL) {
    history.push(REGISTER_URL)
  } else if (state === STATE_REGISTER_CONFIRM_SENT) {
    history.push(FRONTPAGE_URL)
  } else if (state === STATE_REGISTER_CONFIRM) {
    history.push(REGISTER_CONFIRM_URL)
  } else if (state === STATE_REGISTER_DETAILS) {
    history.push(REGISTER_DETAILS_URL)
  } else if (state === STATE_SUCCESS) {
    // We now have a session, so force a redirect (we want the app to reinitialize)
    if (response.redirect_url) {
      window.location.href = response.redirect_url
    } else {
      window.location.href = FRONTPAGE_URL
    }
  } else if (state === STATE_INACTIVE) {
    history.push(INACTIVE_USER_URL)
  } else if (state === STATE_LOGIN_PROVIDER) {
    history.push(LOGIN_PROVIDER_URL)
  }
}

export const isAnonAccessiblePath = (pathname: string): boolean =>
  pathname === AUTH_REQUIRED_URL || pathname.startsWith(SETTINGS_URL)

export const goToFirstLoginStep = (history: Object) => {
  history.push(LOGIN_URL)
}
