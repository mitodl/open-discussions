/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import fetchMock from "fetch-mock/src/server"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"

import * as auth from "./fetch_auth"

import { AUTH_REQUIRED_URL } from "./url"
import {
  NOT_AUTHENTICATED_ERROR_TYPE,
  AUTHENTICATION_FAILED_ERROR_TYPE
} from "../util/rest"

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
        SETTINGS.authenticated_site.session_url = "/session/url"
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
        it(`renews and retries if the request failed for error: ${
          error.error_type
        }`, async () => {
          fetchStub.onFirstCall().returns(Promise.reject(error)) // original api call
          fetchStub.onSecondCall().returns(Promise.resolve()) // original api call again
          fetchMock.mock(SETTINGS.authenticated_site.session_url, {
            has_token: true
          })

          await assert.isFulfilled(authFunc("/url"))

          assert.ok(fetchMock.called())
          assert.ok(fetchStub.calledTwice)
          assert.ok(fetchStub.firstCall.calledWith("/url"))
          assert.ok(fetchStub.secondCall.calledWith("/url"))
          assert.equal(window.location.pathname, "/") // no redirect happened
        })

        it(`redirects and rejects if no token for error: ${
          error.error_type
        }`, async () => {
          fetchStub.onFirstCall().returns(Promise.reject(error)) // original api call
          fetchMock.mock(SETTINGS.authenticated_site.session_url, {
            has_token: false
          })

          await assert.isRejected(authFunc("/url"))

          assert.ok(fetchMock.called())
          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          assert.equal(window.location.pathname, "/auth_required/")
        })

        it(`renews and redirect to /auth_required/ if renew fails for error: ${
          error.error_type
        }`, async () => {
          fetchStub.returns(Promise.reject(error)) // original api call
          fetchMock.mock(SETTINGS.authenticated_site.session_url, 401)

          await assert.isRejected(authFunc("/url"))

          assert.ok(fetchMock.called())
          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          assert.equal(window.location.pathname, "/auth_required/")
        })

        it(`renews and redirect to /auth_required/ if is_authenticated is true for error: ${
          error.error_type
        }`, async () => {
          SETTINGS.is_authenticated = true
          fetchStub.returns(Promise.reject(error)) // original api call
          fetchMock.mock(SETTINGS.authenticated_site.session_url, 401)

          await assert.isRejected(authFunc("/url"))

          assert.isNotOk(fetchMock.called())
          assert.ok(fetchStub.calledOnce)
          assert.ok(fetchStub.calledWith("/url"))
          assert.equal(window.location.pathname, "/auth_required/")
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
      assert.equal(err, "invalid token")
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
