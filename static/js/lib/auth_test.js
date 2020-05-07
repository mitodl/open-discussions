// @flow
/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import qs from "query-string"

import {
  LOGIN_URL,
  LOGIN_PASSWORD_URL,
  LOGIN_PROVIDER_URL,
  REGISTER_URL,
  REGISTER_CONFIRM_URL,
  REGISTER_DETAILS_URL,
  INACTIVE_USER_URL,
  FRONTPAGE_URL,
  AUTH_REQUIRED_URL,
  SETTINGS_URL,
  channelURL
} from "./url"
import {
  FLOW_REGISTER,
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

import {
  generateLoginRedirectUrl,
  processAuthResponse,
  isAnonAccessiblePath,
  needsAuthedSite,
  goToFirstLoginStep
} from "./auth"

const DEFAULT_ARGS = {
  partial_token: null,
  flow:          FLOW_REGISTER,
  errors:        [],
  redirect_url:  null,
  extra_data:    {}
}

describe("auth lib", () => {
  let sandbox, history
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    history = {
      push: sandbox.stub()
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("generateLoginRedirectUrl", () => {
    it("generates a URL for the login page with a 'next' param", () => {
      const next = "/path/to/resource?param=value#anchor"
      window.location = next

      assert.equal(
        generateLoginRedirectUrl(),
        `${LOGIN_URL}?${qs.stringify({ next })}`
      )
    })
  })

  describe("processAuthResponse", () => {
    [
      [STATE_LOGIN_EMAIL, LOGIN_URL],
      [STATE_LOGIN_PASSWORD, LOGIN_PASSWORD_URL],
      [STATE_LOGIN_PROVIDER, LOGIN_PROVIDER_URL],
      [STATE_REGISTER_EMAIL, REGISTER_URL],
      [STATE_REGISTER_CONFIRM_SENT, FRONTPAGE_URL],
      [STATE_REGISTER_CONFIRM, REGISTER_CONFIRM_URL],
      [STATE_REGISTER_DETAILS, REGISTER_DETAILS_URL],
      [STATE_INACTIVE, INACTIVE_USER_URL]
    ].forEach(([state, url]) => {
      it(`pushes ${url} to history if state === ${state}`, () => {
        processAuthResponse(history, { state, ...DEFAULT_ARGS })
        sinon.assert.calledWith(history.push, url)
      })
    })

    it(`redirects to ${FRONTPAGE_URL} if state === ${STATE_SUCCESS}`, () => {
      processAuthResponse(history, { state: STATE_SUCCESS, ...DEFAULT_ARGS })
      assert.equal(window.location.pathname, FRONTPAGE_URL)
    })
  })

  describe("isAnonAccessiblePath", () => {
    [
      [AUTH_REQUIRED_URL, true],
      [SETTINGS_URL, true],
      [`${SETTINGS_URL}token123`, true],
      [channelURL("channel1"), false],
      ["other/url", false]
    ].forEach(([pathname, exp]) => {
      it(`returns ${String(exp)} when pathname=${pathname}`, () => {
        assert.equal(isAnonAccessiblePath(pathname), exp)
      })
    })
  })

  describe("needsAuthedSite", () => {
    [
      [undefined, true],
      ["", true],
      ["some_url", false]
    ].forEach(([sessionUrl, exp]) => {
      it(`returns ${String(exp)} when session url=${String(
        sessionUrl
      )}`, () => {
        if (sessionUrl === undefined) {
          delete SETTINGS.authenticated_site.session_url
        } else {
          SETTINGS.authenticated_site.session_url = sessionUrl
        }
        assert.equal(needsAuthedSite(), exp)
      })
    })
  })

  it(`goToFirstLoginStep goes to the first login step`, () => {
    goToFirstLoginStep(history)
    sinon.assert.calledWith(history.push, LOGIN_URL)
  })
})
