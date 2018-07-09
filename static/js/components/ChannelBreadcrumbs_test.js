import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import {
  ChannelBreadcrumbs,
  ChannelModerationBreadcrumbs
} from "./ChannelBreadcrumbs"

import { makeChannel } from "../factories/channels"
import { channelModerationURL, channelURL } from "../lib/url"

describe("ChannelBreadcrumbs", () => {
  it("should render breadcrumbs", () => {
    const channel = makeChannel()
    const wrapper = shallow(<ChannelBreadcrumbs channel={channel} />)
    const [first, second] = wrapper.find(Link)
    assert.equal(first.props.to, "/")
    assert.equal(first.props.children, "Home")
    assert.equal(second.props.to, channelURL(channel.name))
    assert.equal(second.props.children, channel.title)
  })

  it("should render moderation breadcrumbs", () => {
    const channel = makeChannel()
    const wrapper = shallow(<ChannelModerationBreadcrumbs channel={channel} />)
    const [first, second, third] = wrapper.find(Link)
    assert.equal(first.props.to, "/")
    assert.equal(first.props.children, "Home")
    assert.equal(second.props.to, channelURL(channel.name))
    assert.equal(second.props.children, channel.title)
    assert.equal(third.props.to, channelModerationURL(channel.name))
    assert.equal(third.props.children, "Reported Posts & Comments")
  })
})
