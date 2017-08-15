// @flow
import { assert } from "chai"

import PostList from "../components/PostList"
import SubscriptionsList from "../components/SubscriptionsList"

import { makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { SET_POST_DATA } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"

describe("HomePage", () => {
  let helper, renderComponent, postList, channels

  beforeEach(() => {
    channels = makeChannelList()
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getFrontpageStub.returns(Promise.resolve(postList))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    renderComponent = helper.renderComponent.bind(helper)
  })

  afterEach(() => {
    helper.cleanup()
  })

  const renderPage = () =>
    renderComponent("/", [
      actions.frontpage.get.requestType,
      actions.frontpage.get.successType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      SET_POST_DATA,
      SET_CHANNEL_DATA
    ])

  it("should fetch frontpage, set post data, render", async () => {
    let [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })

  it("lists subscriptions", async () => {
    const [wrapper] = await renderPage()
    wrapper.find(SubscriptionsList).forEach(component => {
      assert.deepEqual(component.props().subscribedChannels, channels)
    })
  })
})
