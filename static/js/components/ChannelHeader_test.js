// @flow
/* global SETTINGS: true */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import ChannelHeader from "./ChannelHeader"

import { makeChannel } from "../factories/channels"
import { channelURL } from "../lib/url"

describe("ChannelHeader", () => {
  let channel

  beforeEach(() => {
    channel = makeChannel()
  })

  const render = (props = {}) =>
    shallow(
      <ChannelHeader
        channel={channel}
        isModerator={false}
        hasNavbar={true}
        {...props}
      />
    )

  it("renders a channel page header", () => {
    const wrapper = render()
    assert.deepEqual(
      wrapper.find("Connect(ChannelAvatar)").prop("channel"),
      channel
    )
    assert.equal(wrapper.find(".title").text(), channel.title)

    const links = wrapper.find("IntraPageNav NavLink")
    assert.equal(links.length, 1)
    const props = links.props()
    assert.equal(props.to, channelURL(channel.name))
  })
  ;[true, false].forEach(hasHeadline => {
    it(`${
      hasHeadline ? "shows" : "doesn't show"
    } the headline for the channel`, () => {
      const headline = "a headline"
      channel.public_description = hasHeadline ? headline : ""
      const wrapper = render()
      assert.equal(wrapper.find(".headline").length, hasHeadline ? 1 : 0)
      if (hasHeadline) {
        assert.equal(wrapper.find(".headline").text(), headline)
      }
    })
  })
  ;[true, false].forEach(isModerator => {
    it(`${
      isModerator ? "shows" : "doesn't show"
    } the moderator edit button`, () => {
      const wrapper = render({ isModerator })

      assert.equal(
        wrapper.find("Connect(ChannelSettingsLink)").length,
        isModerator ? 1 : 0
      )
    })
  })
  ;[true, false].forEach(allowSearch => {
    it(`${
      allowSearch ? "shows" : "doesn't show"
    } the search button depending on if it's allowed`, () => {
      SETTINGS.allow_search = allowSearch
      const wrapper = render()
      assert.equal(wrapper.find(".search-link").length, allowSearch ? 1 : 0)
    })
  })
  ;[true, false].forEach(hasNavbar => {
    it(`${
      hasNavbar ? "shows" : "doesn't show"
    } a navbar depending on the prop`, () => {
      const wrapper = render({ hasNavbar })
      assert.equal(wrapper.find("IntraPageNav").exists(), hasNavbar)
    })
  })
})
