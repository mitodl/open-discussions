// @flow
import { assert } from "chai"

import { makeChannel } from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { FORM_BEGIN_EDIT, FORM_END_EDIT } from "../../actions/forms"
import { formatTitle } from "../../lib/title"
import { editChannelURL, channelURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelPage", () => {
  let helper, renderComponent, channel, listenForActions

  beforeEach(() => {
    channel = makeChannel()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelModeratorsStub.returns(Promise.resolve([]))
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
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
    window.scrollTo = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const makeEvent = (name, value) => ({ target: { value, name } })

  const setDescription = (wrapper, text) =>
    wrapper
      .find(".description textarea")
      .simulate("change", makeEvent("description", text))

  const submit = wrapper => wrapper.find(".save-changes").simulate("submit")

  const renderPage = () =>
    renderComponent(editChannelURL(channel.name), [
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      actions.channels.get.requestType,
      actions.channels.get.successType,
      SET_CHANNEL_DATA,
      FORM_BEGIN_EDIT
    ])

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("should set the description, submit, and navigate back to the channel page", async () => {
    const [wrapper] = await renderPage()
    const expected = {
      ...channel,
      description: "description"
    }

    setDescription(wrapper, expected.description)

    await listenForActions(
      [
        actions.channels.patch.requestType,
        actions.channels.patch.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        actions.postsForChannel.get.requestType,
        actions.postsForChannel.get.successType,
        FORM_END_EDIT
      ],
      () => {
        submit(wrapper)
      }
    )

    helper.updateChannelStub.calledWith(expected)

    assert.equal(helper.currentLocation.pathname, channelURL(channel.name))
  })

  it("cancel and navigate to previous page", async () => {
    const [wrapper] = await renderPage()

    wrapper.find(".cancel").simulate("click")
    assert.equal(helper.currentLocation.pathname, "/")
  })
})
