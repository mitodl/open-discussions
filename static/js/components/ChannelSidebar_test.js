// @flow
import { Link } from "react-router-dom"
import { assert } from "chai"

import Card from "./Card"
import ChannelSidebar from "./ChannelSidebar"
import { Markdown } from "./Markdown"

import { makeChannel } from "../factories/channels"
import { editChannelBasicURL } from "../lib/url"
import { configureShallowRenderer } from "../lib/test_utils"

describe("ChannelSidebar", () => {
  let channel, renderSidebar

  beforeEach(() => {
    channel = makeChannel()
    renderSidebar = configureShallowRenderer(ChannelSidebar, {
      channel,
      isModerator: false
    })
  })

  it("should render sidebar", () => {
    const wrapper = renderSidebar()
    const description = wrapper.find(Markdown)
    assert.equal(description.props().source, channel.description)
    assert.isFalse(wrapper.find(".edit-button").exists())
  })

  it("should render sidebar with edit channel button for moderators ", () => {
    const wrapper = renderSidebar({ isModerator: true })
    const description = wrapper.find(Markdown)
    assert.equal(description.props().source, channel.description)
    assert.isTrue(wrapper.find(".edit-button").exists())
    assert.equal(
      wrapper
        .find(".edit-button")
        .find(Link)
        .props().to,
      editChannelBasicURL(channel.name)
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

  it("should not show moderation card, if isModerator !== true", () => {
    const wrapper = renderSidebar()
    assert.lengthOf(wrapper.find(Card), 1)
  })
})
