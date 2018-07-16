// @flow
/* global SETTINGS: false */
import { assert } from "chai"

import { actions } from "../actions"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("PasswordChangePage", () => {
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
        { provider: "email", email: "test1@example.com" },
        { provider: "micromasters", email: "test2@example.com" },
        { provider: "unknown_provider", email: "test3@example.com" }
      ])
    )
    const wrapper = await renderPage()

    const card = wrapper.find("Card").at(0)
    assert.equal(card.find(".account-settings-row").length, 2)
    assert.equal(
      card
        .find(".email")
        .at(0)
        .text(),
      "test1@example.com"
    )
    assert.equal(
      card
        .find(".email")
        .at(1)
        .text(),
      "test2@example.com"
    )
    assert.equal(
      card
        .find(".highlight")
        .at(0)
        .text()
        .trim(),
      "Test User"
    )
  })

  it("renders the email auth type first", async () => {
    helper.getSocialAuthTypesStub.returns(
      Promise.resolve([
        { provider: "micromasters", email: "mm_auth@example.com" },
        { provider: "email", email: "email_auth@example.com" }
      ])
    )
    const wrapper = await renderPage()

    assert.equal(
      wrapper
        .find(".email")
        .at(0)
        .text(),
      "email_auth@example.com"
    )
    assert.equal(
      wrapper
        .find(".email")
        .at(1)
        .text(),
      "mm_auth@example.com"
    )
  })
})
