// @flow
import { assert } from "chai"

import PostList from "../components/PostList"

import { makeChannel } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_POST_DATA } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL } from "../lib/url"

describe("ChannelPage", () => {
  let helper, renderComponent, channel, postList

  beforeEach(() => {
    channel = makeChannel()
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getPostsForChannelStub.returns(Promise.resolve(postList))
    renderComponent = helper.renderComponent.bind(helper)
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
      SET_POST_DATA
    ])

  it("should fetch postsForChannel, set post data, and render", async () => {
    let [wrapper] = await renderPage(channel)
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })

  it("should handle missing data gracefully", async () => {
    let otherChannel = makeChannel()
    otherChannel.name = "somenamethatshouldnevercollidebecauseitsaridiculouslylongvalue"
    let [wrapper] = await renderPage(otherChannel)
    assert.equal(wrapper.text(), "")
  })
})
