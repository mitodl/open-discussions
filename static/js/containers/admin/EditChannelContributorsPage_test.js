// @flow
import { assert } from "chai"

import { makeChannel, makeContributors } from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { FORM_BEGIN_EDIT, FORM_END_EDIT } from "../../actions/forms"
import { formatTitle } from "../../lib/title"
import { editChannelContributorsURL } from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelContributorsPage", () => {
  let helper, renderComponent, channel, contributors, listenForActions

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
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
    listenForActions = helper.listenForActions.bind(helper)
    window.scrollTo = helper.sandbox.stub()
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = async () => {
    const [wrapper] = await renderComponent(
      editChannelContributorsURL(channel.name),
      [
        actions.subscribedChannels.get.requestType,
        actions.subscribedChannels.get.successType,
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.channelContributors.get.requestType,
        actions.channelContributors.get.successType,
        actions.profiles.get.requestType,
        actions.profiles.get.successType,
        SET_CHANNEL_DATA,
        FORM_BEGIN_EDIT
      ]
    )
    return wrapper.update()
  }

  it("should set the document title", async () => {
    await renderPage()
    assert.equal(document.title, formatTitle("Edit Channel"))
  })

  it("ends the form after hitting the back button", async () => {
    await renderPage()
    await listenForActions(
      [FORM_END_EDIT, actions.frontpage.get.requestType],
      () => {
        helper.browserHistory.goBack()
      }
    )
  })
})
