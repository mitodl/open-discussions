// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import "isomorphic-fetch"
import {
  fetchJSONWithCSRF,
  fetchWithCSRF
} from "redux-hammock/django_csrf_fetch"
import qs from "query-string"

import { AUTH_REQUIRED_URL, LOGIN_URL } from "./url"
import { isNotAuthenticatedErrorType } from "../util/rest"

const redirectAndReject = async () => {
  // redirect to the authenticating app
  const url = SETTINGS.allow_email_auth ? LOGIN_URL : AUTH_REQUIRED_URL
  const { pathname, search, hash } = window.location
  const next = `${pathname}${search}${hash}`
  window.location = `${url}?${qs.stringify({ next })}`
  return Promise.reject("You were logged out, please login again")
}

export const withAuthFailure = (fetchFunc: Function) => async (
  ...args: any
) => {
  try {
    return await fetchFunc(...args)
  } catch (fetchError) {
    if (!fetchError || !isNotAuthenticatedErrorType(fetchError)) {
      // not an authentication failure, rethrow
      throw fetchError
    }

    return redirectAndReject()
  }
}

export const fetchJSONWithAuthFailure = withAuthFailure((...args) =>
  fetchJSONWithCSRF(...args)
)

export const fetchWithAuthFailure = withAuthFailure((...args) =>
  fetchWithCSRF(...args)
)

// Fetch an api endpoint with an anonymous token
// NOTE: this is NOT a JWT token
export const fetchJSONWithToken = async (
  url: string,
  token: string,
  body: ?Object = {}
) => {
  try {
    return await fetchJSONWithCSRF(url, {
      headers: {
        Authorization:  `Token ${token}`,
        "content-type": "application/json"
      },
      ...body
    })
  } catch (fetchError) {
    if (!isNotAuthenticatedErrorType(fetchError)) {
      // not an authentication failure, rethrow
      throw fetchError
    }
    return redirectAndReject()
  }
}
