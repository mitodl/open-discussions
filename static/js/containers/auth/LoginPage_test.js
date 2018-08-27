// @flow
/* global SETTINGS:false */
import R from "ramda"
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { SET_AUTH_USER_DETAIL } from "../../actions/ui"
import { FLOW_LOGIN, STATE_SUCCESS } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedLoginPage, { LoginPage, FORM_KEY } from "./LoginPage"
import { REGISTER_URL } from "../../lib/url"

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
      DEFAULT_STATE
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

  it("should clear the auth endpoint state when unmounting if form errors exist", async () => {
    const { inner, store } = await renderPage({
      auth: {
        data: {
          errors: ["error"]
        }
      }
    })
    inner.unmount()

    const dispatchedActions = store.getActions()
    assert.equal(R.last(dispatchedActions).type, actions.auth.clearType)
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

  it("should contain a link to the signup page", async () => {
    const { inner } = await renderPage()
    const link = inner
      .find("Link")
      .findWhere(c => c.prop("to") === REGISTER_URL)
    assert.ok(link.exists())
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
})
