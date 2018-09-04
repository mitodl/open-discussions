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
  },
  ui: {
    authUserDetail: {}
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

  it("should render errors", async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          errors: ["error"]
        }
      }
    })

    const form = inner.find("AuthPasswordForm")
    assert.equal(form.props().formError, "error")
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

    await onSubmit()

    const dispatchedActions = store.getActions()

    assert.isAtLeast(dispatchedActions.length, 3)
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

  it("passes a click handler to LoginGreeting that navigates to the first login page", async () => {
    const { inner } = await renderPage()

    const { onBackButtonClick } = inner.find("LoginGreeting").props()

    const e = {
      preventDefault: sinon.stub()
    }
    onBackButtonClick(e)

    const history = helper.browserHistory
    assert.lengthOf(history, 2)
    assert.equal(history.location.pathname, LOGIN_URL)
  })
})
