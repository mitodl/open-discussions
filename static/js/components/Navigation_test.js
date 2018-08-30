// @flow
import { assert } from "chai"
import { Link } from "react-router-dom"
import sinon from "sinon"

import Navigation from "./Navigation"
import SubscriptionsList from "./SubscriptionsList"

import * as channels from "../lib/channels"
import { newPostURL, FRONTPAGE_URL, channelURL } from "../lib/url"
import { makeChannelList } from "../factories/channels"
import * as util from "../lib/util"
import { configureShallowRenderer } from "../lib/test_utils"

describe("Navigation", () => {
  let sandbox,
    userIsAnonymousStub,
    defaultProps: Object,
    userCanPostStub,
    renderComponent

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    userIsAnonymousStub = sandbox.stub(util, "userIsAnonymous")
    userIsAnonymousStub.returns(false)
    userCanPostStub = sandbox.stub(channels, "userCanPost")
    userCanPostStub.returns(true)
    const subscribedChannels = makeChannelList(10)
    defaultProps = {
      pathname:           "/",
      subscribedChannels: subscribedChannels,
      channels:           new Map(
        subscribedChannels.map(channel => [channel.name, channel])
      )
    }
    renderComponent = configureShallowRenderer(Navigation, defaultProps)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe("create post link", () => {
    it("should not have channel name if channelName is not in URL", () => {
      const wrapper = renderComponent()
      assert.lengthOf(wrapper.find(Link), 2)
      const link = wrapper.find(".new-post-link")
      assert.equal(link.props().to, "/create_post/")
      assert.equal(
        link
          .children()
          .at(1)
          .text(),
        "Compose"
      )
    })

    it("should highlight the home link if, well, home", () => {
      const wrapper = renderComponent()
      assert.ok(
        wrapper
          .find(".location.current-location")
          .find(".home-link")
          .exists()
      )
    })

    it("shouldn't highlight the homelink if not home!", () => {
      const wrapper = renderComponent({
        pathname: "/hfodfo/asdfasdfasdf"
      })
      assert.isNotOk(
        wrapper
          .find(".location.current-location")
          .find(".home-link")
          .exists()
      )
    })

    it("create post link should have channel name if channelName is in URL", () => {
      const wrapper = renderComponent({
        pathname: channelURL("foobar")
      })
      const link = wrapper.find(".new-post-link")
      assert.equal(link.props().to, newPostURL("foobar"))
      assert.equal(
        link
          .children()
          .at(1)
          .text(),
        "Compose"
      )
    })

    it("should not show the create post link if an anonymous user", () => {
      userIsAnonymousStub.returns(true)
      const wrapper = renderComponent()
      assert.isNotOk(wrapper.find(".mdc-button").exists())
    })

    it("should not show the create post link if the user can't post in the channel", () => {
      userCanPostStub.returns(false)
      const channel = defaultProps.subscribedChannels[3]
      const wrapper = renderComponent({
        pathname: channelURL(channel.name)
      })
      assert.isNotOk(wrapper.find(".mdc-button").exists())
      assert.equal(userCanPostStub.callCount, 1)
      sinon.assert.calledWith(userCanPostStub, channel)
    })

    it("should not show the create post link if the user can't post in any channel", () => {
      userCanPostStub.returns(false)
      const wrapper = renderComponent()
      assert.isNotOk(wrapper.find(".mdc-button").exists())
      assert.equal(
        userCanPostStub.callCount,
        defaultProps.subscribedChannels.length
      )
      defaultProps.subscribedChannels.forEach(channel => {
        sinon.assert.calledWith(userCanPostStub, channel)
      })
    })
  })

  it("should show a SubscriptionsList", () => {
    const channels = makeChannelList(10)
    const wrapper = renderComponent({
      subscribedChannels: channels
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().subscribedChannels,
      channels
    )
  })

  it("should pass the current channel down to the SubscriptionsList", () => {
    const wrapper = renderComponent({
      pathname: channelURL("foobar")
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().currentChannel,
      "foobar"
    )
  })

  it("should have to link to home", () => {
    const wrapper = renderComponent().find(".home-link")
    assert.equal(wrapper.find(".title").text(), "Home")
    assert.equal(wrapper.props().to, FRONTPAGE_URL)
  })

  it("should hide the link to settings, if the user is anonymous", () => {
    userIsAnonymousStub.returns(true)
    const wrapper = renderComponent()
    assert.isNotOk(wrapper.find(".settings-link").exists())
  })
})
