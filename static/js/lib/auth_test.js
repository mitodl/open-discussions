// @flow
import { assert } from "chai"
import sinon from "sinon"

import {
  LOGIN_URL,
  LOGIN_PASSWORD_URL,
  REGISTER_URL,
  REGISTER_CONFIRM_URL,
  REGISTER_DETAILS_URL,
  INACTIVE_USER_URL,
  FRONTPAGE_URL
} from "./url"

import {
  FLOW_REGISTER,
  STATE_LOGIN_EMAIL,
  STATE_LOGIN_PASSWORD,
  STATE_REGISTER_EMAIL,
  STATE_REGISTER_CONFIRM_SENT,
  STATE_REGISTER_CONFIRM,
  STATE_REGISTER_DETAILS,
  STATE_SUCCESS,
  STATE_INACTIVE
} from "../reducers/auth"
import { processAuthResponse } from "./auth"

const DEFAULT_ARGS = {
  partial_token: null,
  flow:          FLOW_REGISTER,
  errors:        []
}

describe("auth libs", () => {
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

  describe("processAuthResponse", () => {
    [
      [STATE_LOGIN_EMAIL, LOGIN_URL],
      [STATE_LOGIN_PASSWORD, LOGIN_PASSWORD_URL],
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
})
