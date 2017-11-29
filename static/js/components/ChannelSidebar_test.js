// @flow
import React from "react"
import ReactMarkdown from "react-markdown"
import { assert } from "chai"
import { shallow } from "enzyme"

import ChannelSidebar from "./ChannelSidebar"

import { makeChannel } from "../factories/channels"

describe("ChannelSidebar", () => {
  const renderSidebar = channel => shallow(<ChannelSidebar channel={channel} />)

  it("should render sidebar", () => {
    const channel = makeChannel()
    const wrapper = renderSidebar(channel)
    const description = wrapper.find(ReactMarkdown)
    assert.equal(description.props().source, channel.description)
  })

  it("should render a description if it's present", () => {
    const channel = makeChannel()
    channel.description = null
    const wrapper = renderSidebar(channel)
    const description = wrapper.find(ReactMarkdown)
    assert.equal(
      description.props().source,
      "(There is no description of this channel)"
    )
  })
})
