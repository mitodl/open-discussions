// @flow
/* global SETTINGS:false */
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { FLOW_REGISTER, STATE_REGISTER_CONFIRM_SENT } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedRegisterPage, { RegisterPage, FORM_KEY } from "./RegisterPage"
import { LOGIN_URL } from "../../lib/url"

const email = "test@example.com"

const DEFAULT_STATE = {
  auth: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        email
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
    const link = inner.find("Link").findWhere(c => c.prop("to") === LOGIN_URL)
    assert.ok(link.exists())
  })

  it("should show a different header if tried to login", async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          partial_token: "abc",
          email
        }
      }
    })

    assert.equal(
      inner.find("h3").text(),
      `We could not find an account with the email: ${email}`
    )
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthEmailForm").props()

    onSubmit()

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 3)
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

  it("form onSubmitContinue prop calls api correctly", async () => {
    const { inner, store } = await renderPage({
      auth: {
        data: {
          partial_token: "abc",
          email
        }
      }
    })

    inner.find("form").simulate("submit", {
      preventDefault: helper.sandbox.stub()
    })

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 2)
    assert.equal(
      dispatchedActions[1].type,
      actions.auth.registerEmail.requestType
    )
    sinon.assert.calledOnce(helper.postEmailRegisterStub)
    sinon.assert.calledWith(
      helper.postEmailRegisterStub,
      FLOW_REGISTER,
      "test@example.com",
      "abc"
    )
  })
})
