// @flow
/* global SETTINGS: false */
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import ChannelNavbar from "./ChannelNavbar"

import { channelURL } from "../lib/url"
import { makeChannel } from "../factories/channels"

describe("ChannelNavbar", () => {
  let channel

  beforeEach(() => {
    channel = makeChannel()
  })

  const render = (props = {}) => {
    const { children } = props
    return shallow(
      <ChannelNavbar channel={channel} {...props}>
        {children}
      </ChannelNavbar>
    )
  }

  it("renders a navbar", () => {
    const children = "some children"
    const wrapper = render({ children })
    const links = wrapper.find("IntraPageNav NavLink")
    assert.equal(links.length, 1)
    const props = links.props()
    assert.equal(props.to, channelURL(channel.name))
    assert.isTrue(
      wrapper
        .find(".extra-navbar-items")
        .childAt(0)
        .text()
        .includes(children)
    )
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
})
