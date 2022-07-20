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
import { shouldIf, shouldIfGt0, mockCourseAPIMethods } from "../lib/test_utils"
import * as embedLib from "../lib/embed"
import * as LearnRouterModule from "./LearnRouter"
import * as PodcastFrontpageModule from "./PodcastFrontpage"

describe("App", () => {
  let helper, renderComponent, channels, postList

  beforeEach(() => {
    channels = makeChannelList(10)
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getChannelStub.returns(Promise.resolve(channels[0]))
    helper.getSettingsStub.returns(
      Promise.resolve([makeFrontpageSetting(), makeCommentSetting()])
    )
    helper.getFrontpageStub.returns(Promise.resolve({ posts: postList }))
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getLivestreamEventsStub.returns(Promise.resolve({ data: [] }))
    renderComponent = helper.renderComponent.bind(helper)
    mockCourseAPIMethods(helper)
    helper.sandbox.stub(embedLib, "ensureTwitterEmbedJS")
    helper.stubComponent(LearnRouterModule, "LearnRouter")
    helper.stubComponent(PodcastFrontpageModule, "PodcastFrontpage")
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
    [true, 0],
    [false, 1]
  ].forEach(([isAnonPath, expLoadCalls]) => {
    describe(`when isAnonAccessiblePath -> ${String(isAnonPath)}`, () => {
      let isAnonStub

      beforeEach(() => {
        isAnonStub = helper.sandbox.stub(authUtils, "isAnonAccessiblePath")
        // If function is called twice, that means there was a redirect to a login page.
        // The login page is anonymously accessible, so return true for the 2nd call.
        isAnonStub.onFirstCall().returns(isAnonPath)
        isAnonStub.onSecondCall().returns(true)
      })

      afterEach(() => {
        isAnonStub.reset()
      })

      it(`${shouldIfGt0(expLoadCalls)} load requirements`, async () => {
        await renderComponent(channelURL("channel1"), [])
        sinon.assert.called(isAnonStub)
        sinon.assert.callCount(helper.getChannelsStub, expLoadCalls)
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
          actions.livestream.get.requestType,
          actions.livestream.get.successType,
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

  //
  ;[
    ["/learn/", true],
    ["/", false]
  ].forEach(([url, isLearnUrl]) => {
    it(`${shouldIf(!isLearnUrl)} include a Drawer, ${shouldIf(
      isLearnUrl
    )} include ContentToolbar if url is ${url}`, async () => {
      const [wrapper] = await renderComponent(url, [])
      assert.equal(wrapper.find("ContentToolbar").exists(), isLearnUrl)
      assert.equal(wrapper.find("Toolbar").exists(), !isLearnUrl)
      assert.equal(wrapper.find("Drawer").exists(), !isLearnUrl)
    })
  })

  //
  ;[true, false].forEach(courseUIEnabled => {
    it(`should render something at "/learn regardless of course_ui_enabled setting"`, async () => {
      SETTINGS.course_ui_enabled = courseUIEnabled
      const [wrapper] = await renderComponent("/learn/", [])
      assert.equal(true, wrapper.find("LearnRouter").exists())
    })
  })
})
