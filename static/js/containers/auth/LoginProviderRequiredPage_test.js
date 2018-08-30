// @flow
import { assert } from "chai"

import { FLOW_LOGIN, STATE_LOGIN_PROVIDER } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedLoginProviderRequiredPage, {
  LoginProviderRequiredPage
} from "./LoginProviderRequiredPage"

const DEFAULT_STATE = {
  auth: {
    data: {
      state: STATE_LOGIN_PROVIDER,
      flow:  FLOW_LOGIN
    },
    processing: false
  }
}

describe("LoginProviderRequiredPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderPage = helper.configureHOCRenderer(
      ConnectedLoginProviderRequiredPage,
      LoginProviderRequiredPage,
      DEFAULT_STATE
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  //
  ;[
    ["micromasters", 'a[href="/login/micromasters/"]'],
    ["saml", "TouchstoneLoginButton"]
  ].forEach(([provider, expectedElementSel]) => {
    it(`should render the page with the right elements given the '${provider}' provider`, async () => {
      const { inner } = await renderPage({
        auth: {
          data: { provider }
        }
      })

      assert.isTrue(inner.find(expectedElementSel).exists())
    })
  })

  it("should render an error page when the provider isn't recognized", async () => {
    const { inner } = await renderPage({
      auth: {
        data: {
          provider: "unrecognized"
        }
      }
    })

    assert.include(inner.html(), "404 error")
  })
})
