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
    ["micromasters", "/login/micromasters/", "MicroMasters"],
    ["invalid", "/login/invalid/", ""]
  ].forEach(([provider, url, name]) => {
    it(`should render the page given the provider: ${provider}`, async () => {
      const { inner } = await renderPage({
        auth: {
          data: { provider }
        }
      })

      assert.equal(inner.find("a").props().href, url)
      assert.equal(inner.find("a").text(), name)
    })
  })
})
