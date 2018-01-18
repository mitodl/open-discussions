// @flow
import { assert } from "chai"

import PostList from "../components/PostList"
import SubscriptionsList from "../components/SubscriptionsList"
import HomePage from "./HomePage"

import { makeChannelList } from "../factories/channels"
import { makeChannelPostList } from "../factories/posts"
import { actions } from "../actions"
import { SET_CHANNEL_DATA } from "../actions/channel"
import { SET_POST_DATA } from "../actions/post"
import IntegrationTestHelper from "../util/integration_test_helper"
import { VALID_POST_SORT_TYPES } from "../lib/sorting"

describe("HomePage", () => {
  let helper, renderComponent, postList, channels, listenForActions

  beforeEach(() => {
    channels = makeChannelList()
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getFrontpageStub.returns(Promise.resolve({ posts: postList }))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    renderComponent = helper.renderComponent.bind(helper)
    listenForActions = helper.listenForActions.bind(helper)
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
    const [wrapper] = await renderPage()
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })

  it("lists subscriptions", async () => {
    const [wrapper] = await renderPage()
    wrapper.find(SubscriptionsList).forEach(component => {
      assert.deepEqual(component.props().subscribedChannels, channels)
    })
  })

  it("should switch the sorting method when an option is selected", async () => {
    const [wrapper] = await renderPage()

    for (const sortType of VALID_POST_SORT_TYPES) {
      await listenForActions(
        [
          actions.frontpage.get.requestType,
          actions.frontpage.get.successType,
          SET_POST_DATA
        ],
        () => {
          const select = wrapper.find(".post-list-title").find("select")
          select.simulate("change", { target: { value: sortType } })
        }
      )

      assert.equal(
        wrapper.find(HomePage).props().location.search,
        `?sort=${sortType}`
      )
    }
  })
})
