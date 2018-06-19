// @flow
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { FLOW_REGISTER, STATE_SUCCESS } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedRegisterDetailsPage, {
  RegisterDetailsPage,
  FORM_KEY
} from "./RegisterDetailsPage"

const DEFAULT_STATE = {
  auth: {
    data: {
      partial_token: "abc",
      flow:          FLOW_REGISTER
    },
    processing: false
  },
  forms: {
    [FORM_KEY]: {
      value: {
        name:     "kate",
        password: "password1"
      },
      errors: {}
    }
  }
}

describe("RegisterDetailsPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postDetailsRegisterStub.returns(
      Promise.resolve({
        flow:  FLOW_REGISTER,
        state: STATE_SUCCESS
      })
    )
    renderPage = helper.configureHOCRenderer(
      ConnectedRegisterDetailsPage,
      RegisterDetailsPage,
      DEFAULT_STATE
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it(`should render the page`, async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          errors: ["error"]
        }
      }
    })

    const form = inner.find("AuthDetailsForm")
    assert.ok(form.exists())
    assert.equal(form.props().formError, "error")
    assert.equal(inner.find("h3").text(), "Thanks for confirming!")
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthDetailsForm").props()

    onSubmit()

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.auth.registerDetails.requestType
    )
    sinon.assert.calledOnce(helper.postDetailsRegisterStub)
    sinon.assert.calledWith(
      helper.postDetailsRegisterStub,
      FLOW_REGISTER,
      "abc",
      "kate",
      "password1"
    )
  })
})
