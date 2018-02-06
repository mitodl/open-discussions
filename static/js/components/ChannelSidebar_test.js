// @flow
import React from "react"
import { Link } from "react-router-dom"
import { assert } from "chai"
import { shallow } from "enzyme"

import Card from "./Card"
import ChannelSidebar from "./ChannelSidebar"
import { Markdown } from "./Markdown"

import { makeChannel } from "../factories/channels"
import { editChannelURL, channelModerationURL } from "../lib/url"

import type { Channel } from "../flow/discussionTypes"

describe("ChannelSidebar", () => {
  let channel

  beforeEach(() => {
    channel = makeChannel()
  })

  const renderSidebar = (
    chan: Channel = channel,
    isModerator: boolean = false
  ) => shallow(<ChannelSidebar channel={chan} isModerator={isModerator} />)

  it("should render sidebar", () => {
    const wrapper = renderSidebar()
    const description = wrapper.find(Markdown)
    assert.equal(description.props().source, channel.description)
    assert.isFalse(wrapper.find(".edit-button").exists())
  })

  it("should render sidebar with edit channel button for moderators ", () => {
    const wrapper = renderSidebar(channel, true)
    const description = wrapper.find(Markdown)
    assert.equal(description.props().source, channel.description)
    assert.isTrue(wrapper.find(".edit-button").exists())
    assert.equal(
      wrapper.find(".edit-button").find(Link).props().to,
      editChannelURL(channel.name)
    )
  })

  it("should render a default description", () => {
    channel.description = ""
    const wrapper = renderSidebar()
    const description = wrapper.find(Markdown)
    assert.equal(
      description.props().source,
      "(There is no description of this channel)"
    )
  })

  it("should show a moderation card, if isModerator === true", () => {
    const wrapper = renderSidebar(channel, true)
    assert.lengthOf(wrapper.find(Card), 2)
    const moderationCard = wrapper.find(Card).at(1)
    assert.equal(moderationCard.props().title, "Moderation Tools")
    const modLink = moderationCard.find(Link)
    assert.equal(modLink.props().to, channelModerationURL(channel.name))
    assert.equal(modLink.props().children, "View reported posts & comments")
  })

  it("should not show moderation card, if isModerator !== true", () => {
    const wrapper = renderSidebar()
    assert.lengthOf(wrapper.find(Card), 1)
  })
})
