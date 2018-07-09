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

    onSubmit()

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 3)
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

  it("should pass an error object into the form when the API call fails", async () => {
    const { inner } = await renderPage({
      passwordReset: {
        error: {
          email: "This email doesn't exist"
        }
      }
    })

    const form = inner.find("PasswordResetForm")
    assert.ok(form.exists())
    assert.equal(form.prop("emailApiError"), "This email doesn't exist")
  })
})
