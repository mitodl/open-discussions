// @flow
/* global SETTINGS:false, fetch: false */
// For mocking purposes we need to use "fetch" defined as a global instead of importing as a local.
import "isomorphic-fetch"
import {
  fetchJSONWithCSRF,
  fetchWithCSRF
} from "redux-hammock/django_csrf_fetch"

import { AUTH_REQUIRED_URL } from "./url"

const renewSession = async () => {
  if (SETTINGS.authenticated_site.session_url) {
    return fetch(SETTINGS.authenticated_site.session_url, {
      credentials: "include" // must be "include" for CORS fetch
    })
  }
  return Promise.reject("Session renew url not provided")
}

const redirectAndReject = async (reason: string) => {
  // redirect to the authenticating app
  window.location = AUTH_REQUIRED_URL
  return Promise.reject(reason)
}

export const withAuthFailure = (fetchFunc: Function) => async (
  ...args: any
) => {
  try {
    return await fetchFunc(...args)
  } catch (fetchError) {
    if (!fetchError || fetchError.errorStatusCode !== 401) {
      // not an authentication failure, rethrow
      throw fetchError
    }

    try {
      // renew the session
      const session = await renewSession()
      const json = await session.json()
      if (!json.has_token) {
        return redirectAndReject("New token was not created")
      }
    } catch (_) {
      return redirectAndReject("Could not renew session")
    }
    // try again now that we have a proper auth
    return fetchFunc(...args)
  }
}

export const fetchJSONWithAuthFailure = withAuthFailure((...args) =>
  fetchJSONWithCSRF(...args)
)

export const fetchWithAuthFailure = withAuthFailure((...args) =>
  fetchWithCSRF(...args)
)
