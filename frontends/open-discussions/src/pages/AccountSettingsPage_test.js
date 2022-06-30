// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("AccountSettingsPage", () => {
  let helper, renderComponent

  const renderPage = async () => {
    const [wrapper] = await renderComponent("/settings/account", [
      actions.accountSettings.get.requestType,
      actions.accountSettings.get.successType
    ])
    return wrapper.update()
  }

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("renders the account settings page with lines for each auth type", async () => {
    SETTINGS.user_full_name = "Test User"
    helper.getSocialAuthTypesStub.returns(
      Promise.resolve([
        { provider: "email" },
        { provider: "micromasters" },
        { provider: "saml" },
        { provider: "unknown_provider" }
      ])
    )
    const wrapper = await renderPage()

    const rows = wrapper.find(".account-settings-row")
    assert.equal(rows.length, 3)
    assert.equal(rows.at(0).find("Link").text(), "Change Password")
    assert.equal(rows.at(0).find("h5").text(), "MIT Open")
    assert.equal(rows.at(1).find("h5").text(), "MicroMasters")
    assert.equal(rows.at(2).find("h5").text(), "Touchstone@MIT")
  })

  it("renders the email auth type first", async () => {
    helper.getSocialAuthTypesStub.returns(
      Promise.resolve([{ provider: "micromasters" }, { provider: "email" }])
    )
    const wrapper = await renderPage()

    const rows = wrapper.find(".account-settings-row")
    assert.equal(rows.length, 2)
    assert.equal(rows.at(0).find("h5").text(), "MIT Open")
  })
})
