/* global SETTINGS: false */
import { assert } from "chai"
import sinon from "sinon"
import fetchMock from "fetch-mock/src/server"
import * as fetchFuncs from "redux-hammock/django_csrf_fetch"
import * as auth from "./auth"

describe("auth", function() {
  this.timeout(5000) // eslint-disable-line no-invalid-this

  const error500 = { errorStatusCode: 500 }
  const error401 = { errorStatusCode: 401 }
  const typeError = new TypeError()

  let sandbox, fetchStub
  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    fetchStub = sandbox.stub(fetchFuncs, "fetchJSONWithCSRF")

    SETTINGS.session_url = "/session/url"
  })
  afterEach(function() {
    sandbox.restore()
    fetchMock.restore()
    for (const cookie of document.cookie.split(";")) {
      const key = cookie.split("=")[0].trim()
      document.cookie = `${key}=`
    }
  })

  it("does not renew if request returned ok", async () => {
    fetchStub.returns(Promise.resolve())

    await assert.isFulfilled(auth.fetchWithAuthFailure("/url"))

    assert.ok(fetchStub.calledWith("/url"))
    assert.equal(window.location.pathname, "/") // no redirect happened
  })

  for (const [message, error] of [
    ["a 500 error", error500],
    ["an unexpected exception", typeError]
  ]) {
    it(`does not renew auth for ${message}`, async () => {
      fetchStub.returns(Promise.reject(error))

      const response = await assert.isRejected(
        auth.fetchWithAuthFailure("/url")
      )

      sinon.assert.calledWith(fetchStub, "/url")
      assert.equal(fetchStub.callCount, 1)
      assert.deepEqual(response, error)
    })
  }

  it("renews and retries if the request failed", async () => {
    fetchStub.onFirstCall().returns(Promise.reject(error401)) // original api call
    fetchStub.onSecondCall().returns(Promise.resolve()) // original api call again
    fetchMock.mock(SETTINGS.session_url, {
      has_token: true
    })

    await assert.isFulfilled(auth.fetchWithAuthFailure("/url"))

    assert.ok(fetchMock.called)
    assert.ok(fetchStub.calledTwice)
    assert.ok(fetchStub.firstCall.calledWith("/url"))
    assert.ok(fetchStub.secondCall.calledWith("/url"))
    assert.equal(window.location.pathname, "/") // no redirect happened
  })

  it("redirects and rejects if no token", async () => {
    fetchStub.onFirstCall().returns(Promise.reject(error401)) // original api call
    fetchMock.mock(SETTINGS.session_url, {
      has_token: false
    })

    await assert.isRejected(auth.fetchWithAuthFailure("/url"))

    assert.ok(fetchMock.called)
    assert.ok(fetchStub.calledOnce)
    assert.ok(fetchStub.calledWith("/url"))
    assert.equal(window.location.pathname, "/auth_required/")
  })

  it("renews and redirect to /auth_required/ if renew fails", async () => {
    fetchStub.returns(Promise.reject(error401)) // original api call
    fetchMock.mock(SETTINGS.session_url, 401)

    await assert.isRejected(auth.fetchWithAuthFailure("/url"))

    assert.ok(fetchMock.called)
    assert.ok(fetchStub.calledOnce)
    assert.ok(fetchStub.calledWith("/url"))
    assert.equal(window.location.pathname, "/auth_required/")
  })
})
