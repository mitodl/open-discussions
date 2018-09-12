// @flow
/* global SETTINGS: false */
import sinon from "sinon"
import { assert } from "chai"
import qs from "query-string"

import App from "./App"

import IntegrationTestHelper from "../util/integration_test_helper"
import { makeChannelList } from "../factories/channels"
import { actions } from "../actions"
import { channelURL, SETTINGS_URL } from "../lib/url"
import * as authUtils from "../lib/auth"
import { makeFrontpageSetting, makeCommentSetting } from "../factories/settings"
import { makeChannelPostList } from "../factories/posts"
import { shouldIf, shouldIfGt0 } from "../lib/test_utils"

describe("App", () => {
  let helper, renderComponent, channels, postList

  const isAuthRequiredPage = wrapper =>
    wrapper.find("AuthRequiredPage").exists()

  beforeEach(() => {
    channels = makeChannelList(10)
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getSettingsStub.returns(
      Promise.resolve([makeFrontpageSetting(), makeCommentSetting()])
    )
    helper.getFrontpageStub.returns(Promise.resolve({ posts: postList }))
    helper.getProfileStub.returns(Promise.resolve(""))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("loads requirements", async () => {
    await renderComponent("/missing", [])
    sinon.assert.calledWith(helper.getChannelsStub)
  })

  it("shows messages in the banner on mount", async () => {
    SETTINGS.username = null
    const message = "Something strange is afoot at the Circle K"
    const [wrapper] = await renderComponent(
      `/missing?${qs.stringify({ message })}`,
      [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channel.SET_CHANNEL_DATA,
        actions.ui.SET_BANNER_MESSAGE
      ]
    )

    wrapper.update()

    assert.deepEqual(helper.store.getState().ui.banner, {
      message,
      visible: true
    })
  })

  //
  ;[
    [true, true, 0, false],
    [true, false, 0, true],
    [false, false, 1, false],
    [false, true, 0, false]
  ].forEach(([needsSite, isAnonPath, expLoadCalls, expRedirect]) => {
    describe(`when needsAuthedSite -> ${String(
      needsSite
    )} and isAnonAccessiblePath -> ${String(isAnonPath)}`, () => {
      let isAnonStub, needsAuthStub

      beforeEach(() => {
        isAnonStub = helper.sandbox.stub(authUtils, "isAnonAccessiblePath")
        // If function is called twice, that means there was a redirect to a login page.
        // The login page is anonymously accessible, so return true for the 2nd call.
        isAnonStub.onFirstCall().returns(isAnonPath)
        isAnonStub.onSecondCall().returns(true)
        needsAuthStub = helper.sandbox
          .stub(authUtils, "needsAuthedSite")
          .returns(needsSite)
      })

      afterEach(() => {
        isAnonStub.reset()
        needsAuthStub.reset()
      })

      it(`${shouldIfGt0(expLoadCalls)} load requirements and ${shouldIf(
        expRedirect
      )} redirect`, async () => {
        const [wrapper] = await renderComponent(channelURL("channel1"), [])
        sinon.assert.called(isAnonStub)
        sinon.assert.called(needsAuthStub)
        sinon.assert.callCount(helper.getChannelsStub, expLoadCalls)
        assert.equal(isAuthRequiredPage(wrapper), expRedirect)
      })
    })
  })

  //
  ;[SETTINGS_URL, `${SETTINGS_URL}tokenbasedauthtokentoken`].forEach(url => {
    it(`loads requirements after navigating away from settings url ${url}`, async () => {
      const [wrapper] = await renderComponent(url, [
        actions.settings.get.requestType,
        actions.settings.get.successType
      ])
      sinon.assert.notCalled(helper.getChannelsStub)

      await helper.listenForActions(
        [
          actions.subscribedChannels.get.requestType,
          actions.subscribedChannels.get.successType,
          actions.frontpage.get.requestType,
          actions.frontpage.get.successType
        ],
        () => {
          const { history } = wrapper.find(App).props()
          history.push({ pathname: "/" })
        }
      )
    })
  })
})
