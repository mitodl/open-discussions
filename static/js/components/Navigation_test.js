// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"
import sinon from "sinon"

import Navigation from "./Navigation"
import SubscriptionsList from "./SubscriptionsList"
import UserInfo from "./UserInfo"

import { newPostURL, FRONTPAGE_URL } from "../lib/url"
import { makeChannelList } from "../factories/channels"
import * as util from "../lib/util"

describe("Navigation", () => {
  let sandbox, userIsAnonymousStub

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
    userIsAnonymousStub = sandbox.stub(util, "userIsAnonymous")
    userIsAnonymousStub.returns(false)
  })

  afterEach(() => {
    sandbox.restore()
  })

  const defaultProps = { pathname: "/", subscribedChannels: [] }
  const renderComponent = (props = defaultProps) =>
    shallow(<Navigation {...props} />)

  it("create post link should not have channel name if channelName is not in URL", () => {
    const wrapper = renderComponent()
    assert.lengthOf(wrapper.find(Link), 3)
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
      pathname: "/channel/foobar"
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

  it("should show UserInfo", () => {
    const wrapper = renderComponent()
    assert.ok(wrapper.find(UserInfo).exists())
  })

  it("should pass the current channel down to the SubscriptionsList", () => {
    const wrapper = renderComponent({
      ...defaultProps,
      pathname: "/channel/foobar"
    })
    assert.equal(
      wrapper.find(SubscriptionsList).props().currentChannel,
      "foobar"
    )
  })

  it("should have a link to the settings", () => {
    const wrapper = renderComponent()
    const { children, to, className } = wrapper
      .find(Link)
      .at(2)
      .props()
    assert.equal(children, "Settings")
    assert.equal(className, "settings-link")
    assert.equal(to, "/settings")
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
