// @flow
/* global SETTINGS */
import { assert } from "chai"
import sinon from "sinon"
import R from "ramda"

import PostList from "../components/PostList"
import SubscriptionsList from "../components/SubscriptionsList"
import CompactPostDisplay from "../components/CompactPostDisplay"
import NotFound from "../components/404"
import ChannelPage from "./ChannelPage"

import {
  makeChannel,
  makeChannelList,
  makeModerators
} from "../factories/channels"
import { makeChannelPostList, makePost } from "../factories/posts"
import { actions } from "../actions"
import { SET_POST_DATA, CLEAR_POST_ERROR } from "../actions/post"
import { SET_CHANNEL_DATA, CLEAR_CHANNEL_ERROR } from "../actions/channel"
import { EVICT_POSTS_FOR_CHANNEL } from "../actions/posts_for_channel"
import IntegrationTestHelper from "../util/integration_test_helper"
import { channelURL } from "../lib/url"
import { formatTitle } from "../lib/title"
import { VALID_POST_SORT_TYPES } from "../lib/sorting"
import { makeReportRecord } from "../factories/reports"

describe("ChannelPage", () => {
  let helper,
    renderComponent,
    listenForActions,
    channels,
    currentChannel,
    otherChannel,
    postList,
    moderators

  beforeEach(() => {
    channels = makeChannelList(10)
    currentChannel = channels[3]
    otherChannel = channels[4]
    moderators = makeModerators()
    postList = makeChannelPostList()
    helper = new IntegrationTestHelper()
    helper.getChannelStub.returns(Promise.resolve(currentChannel))
    helper.getChannelsStub.returns(Promise.resolve(channels))
    helper.getChannelModeratorsStub.returns(Promise.resolve(moderators))
    helper.getPostsForChannelStub.returns(Promise.resolve({ posts: postList }))
    helper.getReportsStub.returns(Promise.resolve(R.times(makeReportRecord, 4)))
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
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType,
      SET_POST_DATA,
      SET_CHANNEL_DATA
    ])

  it("should set the document title", async () => {
    await renderPage(currentChannel)
    assert.equal(document.title, formatTitle(currentChannel.title))
  })

  it("pin post link should just post what's necessary", async () => {
    SETTINGS.username = "username"
    helper.getChannelModeratorsStub.returns(
      Promise.resolve(makeModerators(SETTINGS.username))
    )
    const post = makePost()
    helper.editPostStub.returns(
      Promise.resolve(
        R.evolve(
          {
            stickied: R.not
          },
          post
        )
      )
    )
    postList[0] = post

    const [wrapper] = await renderComponent(channelURL(currentChannel.name), [
      actions.channels.get.requestType,
      actions.channels.get.successType,
      actions.postsForChannel.get.requestType,
      actions.postsForChannel.get.successType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType,
      SET_POST_DATA,
      SET_CHANNEL_DATA
    ])

    wrapper
      .find(CompactPostDisplay)
      .at(0)
      .find(".post-links")
      .find("a")
      .at(1)
      .simulate("click")

    sinon.assert.calledWith(helper.editPostStub, postList[0].id, {
      stickied: !post.stickied
    })
  })

  it("should switch the sorting method when an option is selected", async () => {
    const [wrapper] = await renderPage(currentChannel)

    for (const sortType of VALID_POST_SORT_TYPES) {
      await listenForActions(
        [
          EVICT_POSTS_FOR_CHANNEL,
          actions.channels.get.requestType,
          actions.channels.get.successType,
          actions.postsForChannel.get.requestType,
          actions.postsForChannel.get.successType,
          actions.channelModerators.get.requestType,
          actions.channelModerators.get.successType,
          SET_POST_DATA
        ],
        () => {
          const select = wrapper.find(".post-list-title").find("select")
          select.simulate("change", { target: { value: sortType } })
        }
      )

      assert.equal(
        wrapper.find(ChannelPage).props().location.search,
        `?sort=${sortType}`
      )
    }
  })

  it("should fetch postsForChannel, set post data, and render", async () => {
    const [wrapper] = await renderPage(currentChannel)
    assert.deepEqual(wrapper.find(PostList).props().posts, postList)
  })

  it("should handle missing data gracefully", async () => {
    const otherChannel = makeChannel()
    otherChannel.name =
      "somenamethatshouldnevercollidebecauseitsaridiculouslylongvalue"
    const [wrapper] = await renderPage(otherChannel)
    assert.lengthOf(wrapper.find(".loading").find(".sk-three-bounce"), 1)
  })

  it("lists subscriptions", async () => {
    const [wrapper] = await renderPage(currentChannel)
    sinon.assert.calledOnce(helper.getChannelsStub)
    wrapper.find(SubscriptionsList).forEach(component => {
      assert.deepEqual(component.props().subscribedChannels, channels)
    })
  })

  it("updates requirements when channel name changes", async () => {
    await renderPage(currentChannel)
    sinon.assert.neverCalledWith(helper.getChannelStub, otherChannel.name)
    await listenForActions(
      [
        actions.channels.get.requestType,
        actions.channels.get.successType,
        actions.postsForChannel.get.requestType,
        actions.postsForChannel.get.successType,
        actions.channelModerators.get.requestType,
        actions.channelModerators.get.successType,
        EVICT_POSTS_FOR_CHANNEL
      ],
      () => {
        helper.browserHistory.push(channelURL(otherChannel.name))
      }
    )
    sinon.assert.calledWith(helper.getChannelStub, otherChannel.name)
  })

  it("should clear the error if present on load", async () => {
    helper.store.dispatch({
      type:    actions.channels.get.failureType,
      payload: { error: "some error" }
    })

    await renderComponent(channelURL(currentChannel.name), [
      actions.channels.get.requestType,
      actions.channels.get.successType,
      actions.postsForChannel.get.requestType,
      actions.postsForChannel.get.successType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      actions.channelModerators.get.requestType,
      actions.channelModerators.get.successType,
      SET_POST_DATA,
      SET_CHANNEL_DATA,
      CLEAR_CHANNEL_ERROR,
      CLEAR_POST_ERROR
    ])
    assert.isUndefined(helper.store.getState().channels.error)
  })

  it("should show a 404 if the channel is not found", async () => {
    helper.getChannelStub.returns(Promise.reject({ errorStatusCode: 404 }))

    const [wrapper] = await renderComponent(channelURL(currentChannel.name), [
      actions.channels.get.requestType,
      actions.channels.get.failureType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      SET_CHANNEL_DATA
    ])
    assert(wrapper.find(NotFound).exists())
  })

  it("should show a normal error for other error codes", async () => {
    helper.getChannelStub.returns(Promise.reject({ errorStatusCode: 403 }))

    const [wrapper] = await renderComponent(channelURL(currentChannel.name), [
      actions.channels.get.requestType,
      actions.channels.get.failureType,
      actions.subscribedChannels.get.requestType,
      actions.subscribedChannels.get.successType,
      SET_CHANNEL_DATA
    ])
    assert.isFalse(wrapper.find(NotFound).exists())
    assert.equal(wrapper.find(".main-content").text(), "Error loading page")
  })
})
