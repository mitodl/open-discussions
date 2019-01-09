/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import qs from "query-string"
import fetchMock from "fetch-mock/src/server"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import * as auth from "./fetch_auth"

import { AUTH_REQUIRED_URL, LOGIN_URL } from "../url"
import {
  NOT_AUTHENTICATED_ERROR_TYPE,
  AUTHENTICATION_FAILED_ERROR_TYPE
} from "../../util/rest"

describe("fetch_auth", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  const error500 = { errorStatusCode: 500 }
  const errorNotAuthenticated = { error_type: NOT_AUTHENTICATED_ERROR_TYPE }
  const errorAuthenticationFailed = {
    error_type: AUTHENTICATION_FAILED_ERROR_TYPE
  }
  const typeError = new TypeError()

  let sandbox, fetchStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
    fetchMock.restore()
  })
  ;[
    [auth.fetchJSONWithAuthFailure, "fetchJSONWithCSRF"],
    [auth.fetchWithAuthFailure, "fetchWithCSRF"]
  ].forEach(([authFunc, djangoCSRFFunc]) => {
    describe(authFunc.name, () => {
      beforeEach(() => {
        fetchStub = sandbox.stub(fetchFuncs, djangoCSRFFunc)
        SETTINGS.is_authenticated = false
      })
      afterEach(function() {
        for (const cookie of document.cookie.split(";")) {
          const key = cookie.split("=")[0].trim()
          document.cookie = `${key}=`
        }
      })

      it("does not renew if request returned ok", async () => {
        fetchStub.returns(Promise.resolve())

        await assert.isFulfilled(authFunc("/url"))

        assert.ok(fetchStub.calledWith("/url"))
        assert.equal(window.location.pathname, "/") // no redirect happened
      })

      for (const [message, error] of [
        ["a 500 error", error500],
        ["an unexpected exception", typeError]
      ]) {
        it(`does not renew auth for ${message}`, async () => {
          fetchStub.returns(Promise.reject(error))

          const response = await assert.isRejected(authFunc("/url"))
          sinon.assert.calledWith(fetchStub, "/url")
          assert.equal(fetchStub.callCount, 1)
          assert.deepEqual(response, error)
        })
      }

      //
      [
        [errorNotAuthenticated, false, AUTH_REQUIRED_URL],
        [errorAuthenticationFailed, false, AUTH_REQUIRED_URL],
        [errorNotAuthenticated, true, LOGIN_URL],
        [errorAuthenticationFailed, true, LOGIN_URL]
      ].forEach(([error, allowEmailAuth, expectedUrl]) => {
        it(`redirects to ${expectedUrl} if allow_email_auth: ${allowEmailAuth} for error: ${
          error.error_type
        }`, async () => {
          const next = "/secret/url/?with=params#andhash"
          window.location = next
          SETTINGS.allow_email_auth = allowEmailAuth
          fetchStub.returns(Promise.reject(error)) // original api call

          await assert.isRejected(authFunc("/url"))

          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          assert.equal(window.location.pathname, expectedUrl)
          assert.equal(qs.parse(window.location.search).next, next)
        })

        it(`does not redirect for error: ${
          error.error_type
        } if already on login page`, async () => {
          window.location = expectedUrl
          SETTINGS.allow_email_auth = allowEmailAuth
          fetchStub.returns(Promise.reject(error)) // original api call

          await assert.isRejected(authFunc("/url"))

          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          assert.equal(window.location.pathname, expectedUrl)
          assert.equal(window.location.search, "") // this asserts we didn't redirect back onto the login page with a next param
        })
      })
    })
  })

  describe("fetchJSONWithToken", () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    })

    it("should include the token!", async () => {
      fetchStub.returns(Promise.resolve())
      await auth.fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")

      assert.ok(fetchStub.calledWith, "/beep/boop/", {
        headers: {
          Authorization: "Token mygreatsecuretoken=="
        }
      })
    })

    it("should return and redirect if 401 error", async () => {
      fetchStub.returns(Promise.reject(errorNotAuthenticated))

      const err = await assert.isRejected(
        auth.fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")
      )
      assert.equal(err, "You were logged out, please login again")
      assert.equal(window.location.pathname, AUTH_REQUIRED_URL)
    })

    it("should just reject if not 401 error", async () => {
      fetchStub.returns(Promise.reject(error500))
      const err = await assert.isRejected(
        auth.fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")
      )
      assert.deepEqual(err, error500)
      assert.equal(window.location.pathname, "/")
    })
  })
})
