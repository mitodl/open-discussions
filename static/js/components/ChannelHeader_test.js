// @flow
/* global SETTINGS: true */
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import ChannelHeader from "./ChannelHeader"

import { makeChannel } from "../factories/channels"
import { shouldIf } from "../lib/test_utils"
import { channelURL } from "../lib/url"

describe("ChannelHeader", () => {
  let channel, history

  beforeEach(() => {
    channel = makeChannel()
    history = { some: "history" }
  })

  const render = (props = {}) =>
    shallow(
      <ChannelHeader
        channel={channel}
        isModerator={false}
        history={history}
        {...props}
      />
    )

  it("renders a channel header", () => {
    const wrapper = render()
    assert.deepEqual(
      wrapper.find("Connect(ChannelAvatar)").prop("channel"),
      channel
    )
    const linkProps = wrapper.find("Link").props()
    assert.equal(linkProps.to, channelURL(channel.name))
    assert.equal(linkProps.children, channel.title)
  })
  ;[true, false].forEach(hasNavbar => {
    it(`${shouldIf(hasNavbar)} navbar items`, () => {
      const navbarItems = "navbarItems"
      const wrapper = render({
        navbarItems: hasNavbar ? navbarItems : null
      })
      assert.equal(wrapper.text().includes(navbarItems), hasNavbar)
    })
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

      const link = wrapper.find("Connect(ChannelSettingsLink)")
      assert.equal(link.length, isModerator ? 1 : 0)
      if (isModerator) {
        assert.deepEqual(link.props(), {
          history,
          channel
        })
      }
    })
  })
})
