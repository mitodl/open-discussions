// @flow
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedPasswordResetConfirmPage, {
  PasswordResetConfirmPage,
  FORM_KEY
} from "./PasswordResetConfirmPage"
import { FETCH_SUCCESS } from "redux-hammock/constants"

const DEFAULT_STATE = {
  passwordReset: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        new_password:    "abcdefgh",
        re_new_password: "abcdefgh"
      },
      errors: {}
    }
  }
}

describe("PasswordResetConfirmPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postPasswordResetNewPasswordStub.returns(Promise.resolve())
    renderPage = helper.configureHOCRenderer(
      ConnectedPasswordResetConfirmPage,
      PasswordResetConfirmPage,
      DEFAULT_STATE
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render the password reset form by default", async () => {
    const { inner } = await renderPage()

    const form = inner.find("PasswordResetConfirmForm")
    assert.ok(form.exists())
    assert.isNotOk(form.prop("tokenApiError"))
  })

  it("should render a success message after the form submits successfully", async () => {
    const { inner } = await renderPage({
      passwordReset: {
        loaded:                true,
        processing:            false,
        postNewPasswordStatus: FETCH_SUCCESS
      }
    })

    assert.isFalse(inner.find("PasswordResetConfirmForm").exists())
    assert.include(
      inner.find("h3").at(0).text(),
      "Your password has been reset"
    )
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage(
      {},
      { match: { params: { token: "1234567890", uid: "ABC" } } }
    )

    const { onSubmit } = inner.find("PasswordResetConfirmForm").props()

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.passwordReset.postNewPassword.requestType
    )
    sinon.assert.calledOnce(helper.postPasswordResetNewPasswordStub)
    sinon.assert.calledWith(
      helper.postPasswordResetNewPasswordStub,
      "abcdefgh",
      "abcdefgh",
      "1234567890",
      "ABC"
    )
  })

  it("should pass an error object into the form when the API call fails", async () => {
    const { inner } = await renderPage({
      passwordReset: {
        error: {
          non_field_errors: "Invalid token"
        }
      }
    })

    const form = inner.find("PasswordResetConfirmForm")
    assert.ok(form.exists())
    assert.equal(form.prop("tokenApiError"), "Invalid token")
  })
})
