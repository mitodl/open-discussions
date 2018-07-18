// @flow
import { assert } from "chai"

import { makeChannel, makeModerators } from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { formatTitle } from "../../lib/title"
import { editChannelModeratorsURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelModeratorsPage", () => {
  let helper, renderComponent, channel, moderators

  beforeEach(() => {
    channel = makeChannel()
    moderators = makeModerators()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
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
    renderComponent = helper.renderComponent.bind(helper)
    window.scrollTo = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      editChannelModeratorsURL(channel.name),
      [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        actions.profiles.get.requestType,
        actions.profiles.get.successType,
        SET_CHANNEL_DATA
      ]
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("renders the form", async () => {
    const wrapper = await renderPage()
    const props = wrapper.find("EditChannelMembersForm").props()
    assert.deepEqual(props.members, moderators)
    assert.equal(props.usernameGetter(moderators[0]), moderators[0].moderator_name)
  })
})
