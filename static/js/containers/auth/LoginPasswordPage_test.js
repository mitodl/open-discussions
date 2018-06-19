// @flow
import { assert } from "chai"
import sinon from "sinon"

import { actions } from "../../actions"
import { FLOW_REGISTER, FLOW_LOGIN, STATE_SUCCESS } from "../../reducers/auth"
import { LOGIN_URL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedLoginPasswordPage, {
  LoginPasswordPage,
  FORM_KEY
} from "./LoginPasswordPage"

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
        password: "passwordtest"
      },
      errors: {}
    }
  }
}

describe("LoginPasswordPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postPasswordLoginStub.returns(
      Promise.resolve({
        flow:  FLOW_LOGIN,
        state: STATE_SUCCESS
      })
    )
    renderPage = helper.configureHOCRenderer(
      ConnectedLoginPasswordPage,
      LoginPasswordPage,
      DEFAULT_STATE,
      {
        history: {
          push: helper.sandbox.stub()
        }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[
    [FLOW_LOGIN, "Welcome Back!"],
    [FLOW_REGISTER, "There is already an account with this email"]
  ].forEach(([flow, title]) => {
    it(`should render the page if flow = ${flow}`, async () => {
      const { inner } = await renderPage({
        auth: {
          data: {
            flow,
            errors: ["error"]
          }
        }
      })

      const form = inner.find("AuthPasswordForm")
      assert.ok(form.exists())
      assert.equal(form.props().formError, "error")
      assert.equal(inner.find("h3").text(), title)

      assert.lengthOf(helper.browserHistory, 1)
    })
  })

  //
  ;[FLOW_LOGIN, FLOW_REGISTER].forEach(flow => {
    it(`should redirect to email login page if no partialToken and flow = ${flow}`, async () => {
      await renderPage({
        auth: {
          data: {
            flow,
            partial_token: null
          }
        }
      })
      const history = helper.browserHistory

      assert.lengthOf(history, 2)
      assert.equal(history.location.pathname, LOGIN_URL)
    })
  })

  it("form onSubmit prop calls api correctly", async () => {
    const { inner, store } = await renderPage()

    const { onSubmit } = inner.find("AuthPasswordForm").props()

    onSubmit()

    const dispatchedActions = store.getActions()

    assert.lengthOf(dispatchedActions, 3)
    assert.equal(
      dispatchedActions[2].type,
      actions.auth.loginPassword.requestType
    )
    sinon.assert.calledOnce(helper.postPasswordLoginStub)
    sinon.assert.calledWith(
      helper.postPasswordLoginStub,
      FLOW_REGISTER,
      "abc",
      "passwordtest"
    )
  })
})
