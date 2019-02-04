/* global SETTINGS */
// @flow
import { assert } from "chai"
import sinon from "sinon"

import IntegrationTestHelper from "../util/integration_test_helper"
import { actions } from "../actions"
import { SHOW_DROPDOWN, HIDE_DROPDOWN } from "../actions/ui"
import { makeChannel } from "../factories/channels"
import { makeProfile } from "../factories/profiles"
import * as apiActions from "../util/api_actions"
import ChannelFollowControls, {
  CHANNEL_FOLLOW_DROPDOWN,
  ChannelFollowControls as InnerChannelFollowControls
} from "./ChannelFollowControls"
import { CHANNEL_TYPE_PRIVATE, CHANNEL_TYPE_PUBLIC } from "../lib/channels"
import { FRONTPAGE_URL } from "../lib/url"
import * as reduxSelectors from "../lib/redux_selectors"
import { shouldIf } from "../lib/test_utils"

describe("ChannelFollowControls", () => {
  let helper, render, channel, profile, dropdownMenus, getOwnProfileStub

  beforeEach(() => {
    helper = new IntegrationTestHelper()
    dropdownMenus = new Set()
    channel = {
      ...makeChannel(),
      membership_is_managed: false,
      channel_type:          CHANNEL_TYPE_PRIVATE,
      user_is_contributor:   true,
      user_is_moderator:     false
    }
    profile = makeProfile()

    getOwnProfileStub = helper.sandbox
      .stub(reduxSelectors, "getOwnProfile")
      .returns(profile)
    helper.getChannelStub.returns(Promise.resolve(channel))
    helper.getChannelsStub.returns(Promise.resolve([channel]))
    helper.addChannelSubscriberStub.returns(Promise.resolve())
    helper.deleteChannelSubscriberStub.returns(Promise.resolve())
    helper.deleteChannelContributorStub.returns(Promise.resolve())

    render = helper.configureHOCRenderer(
      ChannelFollowControls,
      InnerChannelFollowControls,
      {
        ui: {
          dropdownMenus
        }
      },
      {
        channel,
        history: helper.browserHistory
      }
    )
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("shows nothing if the user is logged out", async () => {
    getOwnProfileStub.returns(null)
    const { inner } = await render()
    assert.isNull(inner.html())
  })

  it("shows nothing if the channel has managed membership", async () => {
    const props = { channel: { ...channel, membership_is_managed: true } }
    const { inner } = await render({}, props)
    assert.isNull(inner.html())
  })

  it("shows a 'follow' button when the user is not subscribed", async () => {
    const props = { channel: { ...channel, user_is_subscriber: false } }
    const { inner, store } = await render({}, props)
    const button = inner.find("button")
    assert.equal(button.text(), "Follow")
    await button.prop("onClick")()
    assert.equal(
      store.getActions()[0].type,
      actions.channelSubscribers.post.requestType
    )
    sinon.assert.calledWithExactly(
      helper.addChannelSubscriberStub,
      props.channel.name,
      profile.username
    )
    sinon.assert.calledOnce(helper.getChannelsStub)
  })

  describe("when subscribed", () => {
    let props = {}

    beforeEach(() => {
      props = {
        channel: {
          ...channel,
          user_is_subscriber: true
        }
      }
    })

    it("shows a 'following' button that reveals a menu", async () => {
      const { inner, store } = await render({}, props)
      const button = inner.find("a.dropdown-button")
      assert.include(button.text(), "Following")
      button.prop("onClick")()
      assert.equal(store.getActions()[0].type, SHOW_DROPDOWN)
    })
    ;[true, false].forEach(isOpen => {
      it(`${shouldIf(
        isOpen
      )} include a visible dropdown menu when indicated by state`, async () => {
        if (isOpen) {
          dropdownMenus.add(CHANNEL_FOLLOW_DROPDOWN)
        }
        const { inner, store } = await render({}, props)
        const menu = inner.find(".channel-follow-dropdown")
        assert.equal(menu.exists(), isOpen)
        if (isOpen) {
          menu.prop("closeMenu")()
          assert.equal(store.getActions()[0].type, HIDE_DROPDOWN)
        }
      })
    })

    describe("has a dropdown menu", () => {
      const menuItemsSelector = ".channel-follow-dropdown li a",
        unfollowText = "Unfollow channel",
        leaveText = "Leave channel"
      let leaveChannelstub

      beforeEach(async () => {
        leaveChannelstub = helper.sandbox.stub(apiActions, "leaveChannel")
        dropdownMenus.add(CHANNEL_FOLLOW_DROPDOWN)
      })

      it("with the correct options", async () => {
        const { inner } = await render({}, props)
        const menuItems = inner.find(menuItemsSelector)
        assert.equal(menuItems.at(0).text(), unfollowText)
        assert.equal(menuItems.at(1).text(), leaveText)
      })

      it("with an 'unfollow' button that removes the user's subscription", async () => {
        const { inner, store } = await render({}, props)
        const menuItems = inner.find(menuItemsSelector)
        await menuItems.at(0).prop("onClick")()
        const actionsObserved = store.getActions()
        assert.equal(
          actionsObserved[0].type,
          actions.channelSubscribers.delete.requestType
        )
        sinon.assert.calledWithExactly(
          helper.deleteChannelSubscriberStub,
          props.channel.name,
          profile.username
        )
        sinon.assert.calledOnce(helper.getChannelsStub)
      })

      it("with a 'leave' button that removes the user from the channel", async () => {
        const { inner } = await render({}, props)
        const menuItems = inner.find(menuItemsSelector)
        await menuItems.at(1).prop("onClick")()
        sinon.assert.calledOnce(leaveChannelstub)
        const args = leaveChannelstub.firstCall.args
        assert.equal(args[1], props.channel.name)
        assert.equal(args[2], profile.username)
        sinon.assert.calledOnce(helper.getChannelsStub)
        assert.equal(helper.browserHistory.location.pathname, FRONTPAGE_URL)
      })
      ;[
        ["channel_type", CHANNEL_TYPE_PUBLIC],
        ["user_is_contributor", false],
        ["user_is_moderator", true]
      ].forEach(([channelProp, propValue]) => {
        it(`without a 'leave' button if ${channelProp}=${String(
          propValue
        )}`, async () => {
          props.channel[channelProp] = propValue
          const { inner } = await render({}, props)
          const menuItems = inner.find(menuItemsSelector)
          assert.equal(menuItems.at(0).text(), unfollowText)
          assert.lengthOf(menuItems, 1)
        })
      })
    })
  })
})
