// @flow
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedPasswordResetPage, {
  PasswordResetPage,
  FORM_KEY
} from "./PasswordResetPage"
import { FETCH_SUCCESS } from "redux-hammock/constants"

const DEFAULT_STATE = {
  passwordReset: {
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

describe("PasswordResetPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postPasswordResetEmailStub.returns(Promise.resolve())
    renderPage = helper.configureHOCRenderer(
      ConnectedPasswordResetPage,
      PasswordResetPage,
      DEFAULT_STATE
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render the password reset email form by default", async () => {
    const { inner } = await renderPage()

    const form = inner.find("PasswordResetForm")
    assert.ok(form.exists())
    assert.isNotOk(form.prop("emailApiError"))
  })

  it("should render a success message after the form submits successfully", async () => {
    const { inner } = await renderPage({
      passwordReset: {
        loaded:          true,
        processing:      false,
        postEmailStatus: FETCH_SUCCESS
      }
    })

    assert.isFalse(inner.find("PasswordResetForm").exists())
    assert.include(
      inner
        .find("h3")
        .at(0)
        .text(),
      "Thank you!"
    )
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("PasswordResetForm").props()

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.passwordReset.postEmail.requestType
    )
    sinon.assert.calledOnce(helper.postPasswordResetEmailStub)
    sinon.assert.calledWith(
      helper.postPasswordResetEmailStub,
      "test@example.com"
    )
  })

  describe("onSubmitFailure prop", () => {
    [
      [
        { email: "error text" },
        "error text",
        "reset API response with an email error"
      ],
      [{}, "Error resetting password", "empty reset API response"]
    ].forEach(([submitResponse, expErrorText, responseDesc]) => {
      it(`should return correct error object when given ${responseDesc}`, async () => {
        const { inner } = await renderPage()
        const onSubmitFailure = inner.prop("onSubmitFailure")
        const submitFailureResult = onSubmitFailure(submitResponse)
        assert.deepEqual(submitFailureResult, { email: expErrorText })
      })
    })
  })
})
