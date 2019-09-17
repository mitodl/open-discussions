// @flow
import { assert } from "chai"

import { makeChannel } from "../../factories/channels"
import { makeWidgetListResponse } from "../../factories/widgets"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { FORM_BEGIN_EDIT, FORM_END_EDIT } from "../../actions/forms"
import { LINK_TYPE_TEXT, CHANNEL_TYPE_RESTRICTED } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { editChannelBasicURL, channelURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"
import * as embedLib from "../../lib/embed"

describe("EditChannelBasicPage", () => {
  let helper, renderComponent, channel, listenForActions

  beforeEach(() => {
    channel = makeChannel()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getPostsForChannelStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.getFrontpageStub.returns(
      Promise.resolve({
        pagination: {},
        posts:      []
      })
    )
    helper.updateChannelStub.returns(Promise.resolve(channel))
    helper.getProfileStub.returns(Promise.resolve(""))
    helper.getWidgetListStub.returns(Promise.resolve(makeWidgetListResponse(0)))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    helper.sandbox.stub(window, "scrollTo")
    helper.sandbox.stub(embedLib, "ensureTwitterEmbedJS")
  })

  afterEach(() => {
    helper.cleanup()
  })

  const makeEvent = (name, value, checked) => ({
    target: { checked, name, value }
  })

  const setChannelType = (wrapper, value) =>
    wrapper
      .find(`input[value='${value}']`)
      .simulate("change", makeEvent("channel_type", value, true))

  const setPostType = (wrapper, value) =>
    wrapper
      .find(`input[value='${value}']`)
      .simulate("change", makeEvent("allowed_post_types", value, true))

  const submit = wrapper => wrapper.find(".save-changes").simulate("submit")

  const renderPage = async () => {
    const [wrapper] = await renderComponent(editChannelBasicURL(channel.name), [
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      actions.channels.get.requestType,
      actions.channels.get.successType,
      SET_CHANNEL_DATA,
      FORM_BEGIN_EDIT
    ])
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("should set the channel and post types, submit, and navigate back to the channel page", async () => {
    const wrapper = await renderPage()
    const expected = {
      ...channel,
      post_type:    LINK_TYPE_TEXT,
      channel_type: CHANNEL_TYPE_RESTRICTED
    }

    setPostType(wrapper, expected.post_type)
    setChannelType(wrapper, expected.channel_type)

    await listenForActions(
      [
        actions.channels.patch.requestType,
        actions.channels.patch.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.widgets.get.requestType,
        actions.widgets.get.successType,
        actions.postsForChannel.get.requestType,
        actions.postsForChannel.get.successType,
        FORM_END_EDIT
      ],
      () => {
        submit(wrapper)
      }
    )

    helper.updateChannelStub.calledWith(expected)
    const channelUpdateArg = helper.updateChannelStub.firstCall.args[0]
    assert.deepEqual(Object.keys(channelUpdateArg), [
      "name",
      "channel_type",
      "allowed_post_types"
    ])

    assert.equal(helper.currentLocation.pathname, channelURL(channel.name))
  })

  it("navigates to the channel page", async () => {
    const wrapper = await renderPage()
    wrapper.find(".cancel").simulate("click")
    assert.equal(helper.currentLocation.pathname, channelURL(channel.name))
  })

  it("has a channel header", async () => {
    const wrapper = await renderPage()
    assert.isTrue(wrapper.find("ChannelHeader").exists())
  })
})
