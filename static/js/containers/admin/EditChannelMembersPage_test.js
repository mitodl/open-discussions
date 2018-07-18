// @flow
import { assert } from "chai"

import {
  makeChannel,
  makeContributors,
  makeModerators
} from "../../factories/channels"
import { actions } from "../../actions"
import { SET_CHANNEL_DATA } from "../../actions/channel"
import { formatTitle } from "../../lib/title"
import {
  editChannelContributorsURL,
  editChannelModeratorsURL
} from "../../lib/url"
import IntegrationTestHelper from "../../util/integration_test_helper"

describe("EditChannelMembersPage", () => {
  let helper, renderComponent, channel, contributors, moderators

  beforeEach(() => {
    channel = makeChannel()
    contributors = makeContributors()
    moderators = makeModerators()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.getChannelContributorsStub.returns(Promise.resolve(contributors))
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
  ;[
    ["contributors", "channelContributors", editChannelContributorsURL],
    ["moderators", "channelModerators", editChannelModeratorsURL]
  ].forEach(([pageDescription, reducerName, urlFunction]) => {
    describe(pageDescription, () => {
      let members

      beforeEach(() => {
        members = pageDescription === "contributors" ? contributors : moderators
      })

      const renderPage = async () => {
        const [wrapper] = await renderComponent(urlFunction(channel.name), [
          actions.subscribedChannels.get.requestType,
          actions.subscribedChannels.get.successType,
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions[reducerName].get.requestType,
          actions[reducerName].get.successType,
          actions.profiles.get.requestType,
          actions.profiles.get.successType,
          SET_CHANNEL_DATA
        ])
        return wrapper.update()
      }

      it("should set the document title", async () => {
        await renderPage()
        assert.equal(document.title, formatTitle("Edit Channel"))
      })

      it("renders the page object", async () => {
        const wrapper = await renderPage()
        assert.equal(wrapper.find("EditChannelMembersPage").length, 1)
        const props = wrapper.find("EditChannelMembersPage").props()

        assert.equal(props.reducerName, reducerName)
        assert.isOk(props.usernameGetter(members[0]))
      })

      it("renders the form", async () => {
        const wrapper = await renderPage()
        const props = wrapper.find("EditChannelMembersForm").props()
        assert.deepEqual(props.members, members)
        assert.equal(props.channelName, channel.name)
      })
    })
  })
})
