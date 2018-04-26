// @flow
/* global SETTINGS: false */
import sinon from "sinon"
import { assert } from "chai"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelList } from "../factories/channels"
import { actions } from "../actions"
import { SETTINGS_URL } from "../lib/url"
import { makeFrontpageSetting, makeCommentSetting } from "../factories/settings"

describe("App", () => {
  let helper, renderComponent, channels

  beforeEach(() => {
    channels = makeChannelList(10)
    helper = new IntegrationTestHelper()
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getSettingsStub.returns(
      Promise.resolve([makeFrontpageSetting(), makeCommentSetting()])
    )
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("loads requirements", async () => {
    await renderComponent("/missing", [])
    sinon.assert.calledWith(helper.getChannelsStub)
  })

  it("doesn't load requirements for auth_required", async () => {
    await renderComponent("/auth_required/", [])
    sinon.assert.notCalled(helper.getChannelsStub)
  })

  it("doesn't load requirements for settings", async () => {
    await renderComponent("/settings/a_setting", [])
    sinon.assert.notCalled(helper.getChannelsStub)
  })

  it("doesn't load requirements for anonymous users if allow_anonymous is false", async () => {
    delete SETTINGS.authenticated_site.session_url
    await renderComponent("/missing", [])
    sinon.assert.notCalled(helper.getChannelsStub)
  })

  it("loads requirements for anonymous users if allow_anonymous is true", async () => {
    delete SETTINGS.authenticated_site.session_url
    SETTINGS.allow_anonymous = true
    await renderComponent("/missing", [])
    sinon.assert.calledWith(helper.getChannelsStub)
  })

  const expectedLoginRequiredTitle = "Login Required | MIT Open Discussions"
  it("redirects if you have no session url", async () => {
    delete SETTINGS.authenticated_site.session_url
    await renderComponent("/channel/foobaz", [])
    assert.equal(document.title, expectedLoginRequiredTitle)
  })

  it("doesn't redirect if you have no session url but anonymous access is allowed", async () => {
    delete SETTINGS.authenticated_site.session_url
    SETTINGS.allow_anonymous = true
    await renderComponent("/channel/foobaz", [])
    assert.notEqual(document.title, expectedLoginRequiredTitle)
  })

  it("doesnt redirect if you have no session url but are on the settings page", async () => {
    delete SETTINGS.authenticated_site.session_url
    helper.getSettingsStub.returns(
      Promise.resolve([makeFrontpageSetting(), makeCommentSetting()])
    )
    await renderComponent(SETTINGS_URL, [
      actions.settings.get.requestType,
      actions.settings.get.successType
    ])
    assert.notEqual(document.title, expectedLoginRequiredTitle)
  })
})
