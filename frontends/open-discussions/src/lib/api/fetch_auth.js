// @flow
/* global SETTINGS:false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import "isomorphic-fetch"
import {
  fetchJSONWithCSRF,
  fetchWithCSRF
} from "redux-hammock/django_csrf_fetch"

import { LOGIN_URL } from "../url"
import { generateLoginRedirectUrl } from "../../lib/auth"
import { isNotAuthenticatedErrorType } from "../../util/rest"

const redirectAndReject = async () => {
  // redirect to the authenticating app
  const { pathname } = window.location

  // ensure that we don't end up in a redirect loop
  if (pathname !== LOGIN_URL) {
    window.location = generateLoginRedirectUrl()
  }

  return Promise.reject("You were logged out, please login again")
}

export const withAuthFailure =
  (fetchFunc: Function) =>
    async (...args: any) => {
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
