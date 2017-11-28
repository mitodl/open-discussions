// @flow
import React from "react"
import ReactMarkdown from "react-markdown"
import { Link } from "react-router-dom"
import { assert } from "chai"
import { shallow } from "enzyme"

import ChannelSidebar from "./ChannelSidebar"

import { makeChannel } from "../factories/channels"
import { editChannelURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

describe("ChannelSidebar", () => {
  let channel

  beforeEach(() => {
    channel = makeChannel()
  })

  const renderSidebar = (channel: Channel, isModerator: boolean = false) =>
    shallow(<ChannelSidebar channel={channel} isModerator={isModerator} />)

  it("should render sidebar", () => {
    const wrapper = renderSidebar(channel)
    const description = wrapper.find(ReactMarkdown)
    assert.equal(description.props().source, channel.description)
    assert.isFalse(wrapper.find(".edit-button").exists())
  })

  it("should render sidebar with edit channel button for moderators ", () => {
    const wrapper = renderSidebar(channel, true)
    const description = wrapper.find(ReactMarkdown)
    assert.equal(description.props().source, channel.description)
    assert.isTrue(wrapper.find(".edit-button").exists())
    assert.equal(
      wrapper.find(".edit-button").find(Link).props().to,
      editChannelURL(channel.name)
    )
  })

  it("should render a default description", () => {
    channel.description = ""
    const wrapper = renderSidebar(channel)
    const description = wrapper.find(ReactMarkdown)
    assert.equal(
      description.props().source,
      "(There is no description of this channel)"
    )
  })
})
