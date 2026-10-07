// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { SET_AUTH_USER_DETAIL } from "../../actions/ui"
import { FLOW_LOGIN, STATE_SUCCESS } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedLoginPage, { LoginPage, FORM_KEY } from "./LoginPage"
import { REGISTER_URL } from "../../lib/url"
import { shouldIf } from "../../lib/test_utils"

const TEST_EMAIL = "test@example.com"
const DEFAULT_STATE = {
  auth: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        email: TEST_EMAIL
      },
      errors: {}
    }
  }
}

describe("LoginPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postEmailLoginStub.returns(
      Promise.resolve({
        flow:  FLOW_LOGIN,
        state: STATE_SUCCESS
      })
    )
    renderPage = helper.configureHOCRenderer(
      ConnectedLoginPage,
      LoginPage,
      DEFAULT_STATE,
      { location: {} }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render an initial form", async () => {
    const { inner } = await renderPage()

    const form = inner.find("AuthEmailForm")
    assert.ok(form.exists())
  })

  describe("getSubmitResultErrors prop", () => {
    const errorText = "error text"

    //
    ;[
      [[errorText], true],
      [[], false]
    ].forEach(([errors, expectErrorObject]) => {
      it(`${shouldIf(
        expectErrorObject
      )} return error object if API response error count == ${String(
        errors.length
      )}`, async () => {
        const { inner } = await renderPage()
        const getSubmitResultErrors = inner.prop("getSubmitResultErrors")
        const submitResultErrors = getSubmitResultErrors({ errors: errors })

        const expectedResult = expectErrorObject
          ? { email: errorText }
          : undefined
        assert.deepEqual(submitResultErrors, expectedResult)
      })
    })
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

  it("should not contain a link to the signup page", async () => {
    const { inner } = await renderPage()
    const link = inner
      .find("Link")
      .findWhere(c => c.prop("to") === `${REGISTER_URL}?next=%2F`)
    assert.ok(!link.exists())
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthEmailForm").props()

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
    assert.equal(dispatchedActions[2].type, actions.auth.loginEmail.requestType)
    sinon.assert.calledOnce(helper.postEmailLoginStub)
    sinon.assert.calledWith(helper.postEmailLoginStub, FLOW_LOGIN, TEST_EMAIL)
  })

  it("sets some detail in the state about the user after form submission", async () => {
    const extraData = {
      name:                "Testuser",
      profile_image_small: "http://example.com/abc.jpg"
    }
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthEmailForm").props()

    helper.postEmailLoginStub.returns(
      Promise.resolve({
        flow:       FLOW_LOGIN,
        state:      STATE_SUCCESS,
        extra_data: extraData
      })
    )

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 5)
    const authDetailAction = dispatchedActions[4]
    assert.equal(authDetailAction.type, SET_AUTH_USER_DETAIL)
    assert.deepEqual(authDetailAction.payload, {
      email: TEST_EMAIL,
      ...extraData
    })
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
  })
})
