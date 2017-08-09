// @flow
import { assert } from "chai"
import sinon from "sinon"

import PostList from "../components/PostList"

import { makeChannel, makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import { SET_CHANNEL_DATA } from "../actions/channel"
import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL } from "../lib/url"

describe("ChannelPage", () => {
  let helper, renderComponent, listenForActions, channels, currentChannel, otherChannel, postList

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[3]
    otherChannel = channels[4]
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getPostsForChannelStub.returns(Promise.resolve(postList))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = channel =>
    renderComponent(channelURL(channel.name), [
      actions.channels.get.requestType,
      actions.channels.get.successType,
      actions.postsForChannel.get.requestType,
      actions.postsForChannel.get.successType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      SET_POST_DATA,
      SET_CHANNEL_DATA
    ])

  it("should fetch postsForChannel, set post data, and render", async () => {
    let [wrapper] = await renderPage(currentChannel)
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })

  it("should handle missing data gracefully", async () => {
    let otherChannel = makeChannel()
    otherChannel.name = "somenamethatshouldnevercollidebecauseitsaridiculouslylongvalue"
    let [wrapper] = await renderPage(otherChannel)
    assert.equal(wrapper.text(), "")
  })

  it("lists subscriptions", () => {
    return renderPage(currentChannel).then(([wrapper]) => {
      sinon.assert.calledOnce(helper.getChannelsStub)

      assert.deepEqual(wrapper.find("SubscriptionsSidebar").props().subscribedChannels, channels)
    })
  })

  it("updates requirements when channel name changes", () => {
    return renderPage(currentChannel).then(() => {
      sinon.assert.neverCalledWith(helper.getChannelStub, otherChannel.name)
      return listenForActions(
        [
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions.postsForChannel.get.requestType,
          actions.postsForChannel.get.successType
        ],
        () => {
          helper.browserHistory.push(channelURL(otherChannel.name))
        }
      ).then(() => {
        sinon.assert.calledWith(helper.getChannelStub, otherChannel.name)
      })
    })
  })
})
