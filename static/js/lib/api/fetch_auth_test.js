/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import fetchMock from "fetch-mock/src/server"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import {
  fetchJSONWithAuthFailure,
  fetchWithAuthFailure,
  fetchJSONWithToken
} from "./fetch_auth"
import * as authHelpers from "../../lib/auth"

import { LOGIN_URL } from "../url"
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
  const fakeRedirectUrl = "http://example.com/fake"

  let sandbox, fetchStub, loginRedirectUrlStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    loginRedirectUrlStub = sandbox
      .stub(authHelpers, "generateLoginRedirectUrl")
      .returns(fakeRedirectUrl)
  })

  afterEach(() => {
    sandbox.restore()
    fetchMock.restore()
  })
  ;[
    [fetchJSONWithAuthFailure, "fetchJSONWithAuthFailure", "fetchJSONWithCSRF"],
    [fetchWithAuthFailure, "fetchWithAuthFailure", "fetchWithCSRF"]
  ].forEach(([authFunc, funcName, djangoCSRFFunc]) => {
    describe(funcName, () => {
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
      [errorNotAuthenticated, errorAuthenticationFailed].forEach(error => {
        it(`redirects to login page for error: ${
          error.error_type
        }`, async () => {
          fetchStub.returns(Promise.reject(error)) // original api call

          await assert.isRejected(authFunc("/url"))

          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          sinon.assert.calledOnce(loginRedirectUrlStub)
          assert.equal(window.location.toString(), fakeRedirectUrl)
        })
      })

      it("does not redirect for error if already on login page", async () => {
        window.location = LOGIN_URL
        fetchStub.returns(Promise.reject({ error_type: "abc" }))

        await assert.isRejected(authFunc("/url"))

        assert.ok(fetchStub.calledOnce)
        assert.ok(fetchStub.calledWith("/url"))
        sinon.assert.notCalled(loginRedirectUrlStub)
      })
    })
  })

  describe("fetchJSONWithToken", () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")
    })

    it("should include the token!", async () => {
      fetchStub.returns(Promise.resolve())
      await fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")

      assert.ok(fetchStub.calledWith, "/beep/boop/", {
        headers: {
          Authorization: "Token mygreatsecuretoken=="
        }
      })
    })

    it("should return and redirect if 401 error", async () => {
      fetchStub.returns(Promise.reject(errorNotAuthenticated))

      const err = await assert.isRejected(
        fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")
      )
      assert.equal(err, "You were logged out, please login again")
      sinon.assert.calledOnce(loginRedirectUrlStub)
      assert.equal(window.location.toString(), fakeRedirectUrl)
    })

    it("should just reject if not 401 error", async () => {
      fetchStub.returns(Promise.reject(error500))
      const err = await assert.isRejected(
        fetchJSONWithToken("/beep/boop/", "mygreatsecuretoken==")
      )
      assert.deepEqual(err, error500)
      assert.equal(window.location.pathname, "/")
    })
  })
})
