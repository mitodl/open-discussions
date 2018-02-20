// @flow
/* global SETTINGS: false */
import sinon from "sinon"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelList } from "../factories/channels"
import { actions } from "../actions"
import { SETTINGS_URL } from "../lib/url"
import { makeNotificationSetting } from "../factories/settings"

describe("App", () => {
  let helper, renderComponent, channels

  beforeEach(() => {
    channels = makeChannelList(10)
    helper = new IntegrationTestHelper()
    helper.getChannelsStub.returns(Promise.resolve(channels))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("loads requirements", async () => {
    await renderComponent("/missing", [
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType
    ])
    sinon.assert.calledWith(helper.getChannelsStub)
  })

  it("doesn't load requirements for auth_required", () => {
    assert.isRejected(
      renderComponent("/auth_required/", [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType
      ])
    )
  })

  it("redirects if you have no session url", async () => {
    delete SETTINGS.authenticated_site.session_url
    await renderComponent("/channel/foobaz", [])
    assert.equal(document.title, "Login Required | MIT Open Discussions")
  })

  it("doesnt redirect if you have no session url but are on the settings page", async () => {
    delete SETTINGS.authenticated_site.session_url
    helper.getSettingsStub.returns(Promise.resolve([makeNotificationSetting()]))
    await renderComponent(SETTINGS_URL, [
      actions.settings.get.requestType,
      actions.settings.get.successType
    ])
    assert.notEqual(document.title, "Login Required | MIT Open Discussions")
  })
})
