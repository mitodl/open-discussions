// @flow
import { assert } from "chai"
import sinon from "sinon"
import { FETCH_SUCCESS } from "redux-hammock/constants"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"
import ConnectedPasswordChangePage, {
  PasswordChangePage,
  FORM_KEY
} from "./PasswordChangePage"

const DEFAULT_STATE = {
  passwordChange: {
    data:       {},
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        current_password: "asdfasdf",
        new_password:     "asdfasdf"
      },
      errors: {}
    }
  }
}

describe("PasswordChangePage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postSetPasswordStub.returns(Promise.resolve())
    renderPage = helper.configureHOCRenderer(
      ConnectedPasswordChangePage,
      PasswordChangePage,
      DEFAULT_STATE
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render the password change form by default", async () => {
    const { inner } = await renderPage()

    const form = inner.find("PasswordChangeForm")
    assert.ok(form.exists())
    assert.isNotOk(form.prop("invalidPwError"))
  })

  it("should render a success message after the form submits successfully", async () => {
    const { inner } = await renderPage({
      passwordChange: {
        loaded:     true,
        processing: false,
        postStatus: FETCH_SUCCESS
      }
    })

    assert.isFalse(inner.find("PasswordChangeForm").exists())
    assert.include(
      inner.find("h3").at(0).text(),
      "Your password has been changed successfully!"
    )
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("PasswordChangeForm").props()

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.passwordChange.post.requestType
    )
    sinon.assert.calledOnce(helper.postSetPasswordStub)
    sinon.assert.calledWith(helper.postSetPasswordStub, "asdfasdf", "asdfasdf")
  })

  it("should pass an error object into the form when the API call fails", async () => {
    const { inner } = await renderPage({
      passwordChange: {
        error: {
          current_password: "Invalid password"
        }
      }
    })

    const form = inner.find("PasswordChangeForm")
    assert.ok(form.exists())
    assert.equal(form.prop("invalidPwError"), "Invalid password")
  })
})
