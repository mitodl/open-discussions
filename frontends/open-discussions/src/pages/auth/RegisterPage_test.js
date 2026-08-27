// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"

import { actions } from "../../actions"
import { SET_BANNER_MESSAGE } from "../../actions/ui"
import { FLOW_REGISTER, STATE_REGISTER_CONFIRM_SENT } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedRegisterPage, { RegisterPage, FORM_KEY } from "./RegisterPage"
import { FRONTPAGE_URL, LOGIN_URL } from "../../lib/url"

const email = "test@example.com"
const recaptcha = "recaptcha_response"

const DEFAULT_STATE = {
  auth: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        email,
        recaptcha
      },
      errors: {}
    }
  }
}
describe("RegisterPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postEmailRegisterStub.returns(
      Promise.resolve({
        flow:  FLOW_REGISTER,
        state: STATE_REGISTER_CONFIRM_SENT,
        email
      })
    )
    renderPage = helper.configureHOCRenderer(
      ConnectedRegisterPage,
      RegisterPage,
      DEFAULT_STATE,
      { location: {} }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render an initial form", async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          errors: ["error"]
        }
      }
    })

    const form = inner.find("AuthEmailForm")
    assert.ok(form.exists())
    assert.equal(form.props().formError, "error")
  })

  it("should render an ExternalLogins component", async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          errors: ["error"]
        }
      }
    })

    const link = inner.find("ExternalLogins")
    assert.ok(link.exists())
  })

  it("should contain a link to the login page", async () => {
    const { inner } = await renderPage()
    const link = inner
      .find("Link")
      .findWhere(c => c.prop("to") === `${LOGIN_URL}?next=%2F`)
    assert.ok(link.exists())
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthEmailForm").props()

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.auth.registerEmail.requestType
    )
    sinon.assert.calledOnce(helper.postEmailRegisterStub)
    sinon.assert.calledWith(
      helper.postEmailRegisterStub,
      FLOW_REGISTER,
      "test@example.com"
    )
  })

  it("form onSubmitResult prop redirects and sets a banner message", async () => {
    const { inner, store } = await renderPage()

    const { onSubmitResult } = inner.props()

    onSubmitResult({
      state:  STATE_REGISTER_CONFIRM_SENT,
      flow:   "register",
      email:  email,
      errors: []
    })

    const historyEntries = helper.browserHistory.entries
    assert.equal(historyEntries.length, 2)
    assert.equal(R.last(historyEntries).pathname, FRONTPAGE_URL)
    const dispatchedActions = store.getActions()
    assert.equal(R.last(dispatchedActions).type, SET_BANNER_MESSAGE)
  })

  describe("when login is disabled", () => {
    beforeEach(() => {
      SETTINGS.FEATURES = { DISABLE_USER_LOGIN: true }
    })

    afterEach(() => {
      SETTINGS.FEATURES = {}
    })

    it("should show login disabled message instead of form", async () => {
      const { inner } = await renderPage()

      const form = inner.find("AuthEmailForm")
      assert.ok(!form.exists())

      const disabledMessage = inner.find(".login-disabled-message")
      assert.ok(disabledMessage.exists())
      assert.include(
        disabledMessage.text(),
        "Login is currently disabled. The site is now read-only."
      )
    })

    it("should not render ExternalLogins", async () => {
      const { inner } = await renderPage()

      const externalLogins = inner.find("ExternalLogins")
      assert.ok(!externalLogins.exists())
    })

    it("should not render link to login page", async () => {
      const { inner } = await renderPage()

      const link = inner
        .find("Link")
        .findWhere(c => c.prop("to") === `${LOGIN_URL}?next=%2F`)
      assert.ok(!link.exists())
    })
  })
})
