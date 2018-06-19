// @flow
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { FLOW_LOGIN, STATE_SUCCESS } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedLoginPage, { LoginPage, FORM_KEY } from "./LoginPage"

const DEFAULT_STATE = {
  auth: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        email: "test@example.com"
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

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthEmailForm").props()

    onSubmit()

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 3)
    assert.equal(dispatchedActions[2].type, actions.auth.loginEmail.requestType)
    sinon.assert.calledOnce(helper.postEmailLoginStub)
    sinon.assert.calledWith(
      helper.postEmailLoginStub,
      FLOW_LOGIN,
      "test@example.com"
    )
  })
})
