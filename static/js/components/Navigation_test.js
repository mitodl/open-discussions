// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"
import sinon from "sinon"

import Navigation from "./Navigation"
import SubscriptionsList from "./SubscriptionsList"

import * as channels from "../lib/channels"
import { newPostURL, FRONTPAGE_URL, channelURL } from "../lib/url"
import { makeChannelList } from "../factories/channels"
import * as util from "../lib/util"

describe("Navigation", () => {
  let sandbox, userIsAnonymousStub, defaultProps: Object, userCanPostStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
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
  })

  afterEach(() => {
    sandbox.restore()
  })

  const renderComponent = (props = defaultProps) =>
    shallow(<Navigation {...props} />)

  describe("create post link", () => {
    it("should not have channel name if channelName is not in URL", () => {
      const wrapper = renderComponent()
      assert.lengthOf(wrapper.find(Link), 2)
      const props = wrapper
        .find(Link)
        .at(0)
        .props()
      assert.equal(props.to, "/create_post/")
      assert.equal(props.children, "Submit a New Post")
    })

    it("create post link should have channel name if channelName is in URL", () => {
      const wrapper = renderComponent({
        ...defaultProps,
        pathname: channelURL("foobar")
      })
      const link = wrapper.find(Link).first()
      assert.equal(link.props().to, newPostURL("foobar"))
      assert.equal(link.props().children, "Submit a New Post")
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
        ...defaultProps,
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
      ...defaultProps,
      subscribedChannels: channels
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().subscribedChannels,
      channels
    )
  })

  it("should pass the current channel down to the SubscriptionsList", () => {
    const wrapper = renderComponent({
      ...defaultProps,
      pathname: channelURL("foobar")
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().currentChannel,
      "foobar"
    )
  })

  it("should have to link to home", () => {
    const { to, className, children } = renderComponent()
      .find(Link)
      .at(1)
      .props()
    assert.equal(children[1], "Home")
    assert.equal(className, "home-link")
    assert.equal(to, FRONTPAGE_URL)
  })

  it("should hide the link to settings, if the user is anonymous", () => {
    userIsAnonymousStub.returns(true)
    const wrapper = renderComponent()
    assert.isNotOk(wrapper.find(".settings-link").exists())
  })
})
