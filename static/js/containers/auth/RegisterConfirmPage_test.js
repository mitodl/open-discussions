// @flow
import { assert } from "chai"

import { REGISTER_URL } from "../../lib/url"
import { FLOW_REGISTER, STATE_REGISTER_DETAILS } from "../../reducers/auth"
import IntegrationTestHelper from "../../util/integration_test_helper"
import ConnectedRegisterConfirmPage, {
  RegisterConfirmPage
} from "./RegisterConfirmPage"

const DEFAULT_STATE = {
  auth: {
    data:       {},
    processing: false
  }
}

describe("RegisterConfirmPage", () => {
  let helper, renderPage

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    helper.postConfirmRegisterStub.returns(
      Promise.resolve({
        flow:  FLOW_REGISTER,
        state: STATE_REGISTER_DETAILS
      })
    )
    renderPage = helper.configureHOCRenderer(
      ConnectedRegisterConfirmPage,
      RegisterConfirmPage,
      DEFAULT_STATE,
      {
        location: {
          search: "verification_code=abc&partial_token=def"
        }
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("should render an error message if no code or partial_token", async () => {
    const { inner } = await renderPage(
      {},
      {
        location: {
          search: ""
        }
      }
    )

    assert.include(
      inner
        .find("p")
        .at(0)
        .text(),
      "No confirmation code was provided or it has expired"
    )
    assert.equal(inner.find("Link").props().to, REGISTER_URL)
  })

  it("should render <Loading/> if code and partial_token", async () => {
    const { inner } = await renderPage()

    assert.ok(inner.find("Loading").exists())
  })
})
