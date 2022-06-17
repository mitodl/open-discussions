// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import ChannelNavbar from "./ChannelNavbar"

import { shouldIf, isIf } from "../lib/test_utils"
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
    const homeLink = wrapper.find(".home-link")
    const props = homeLink.props()
    assert.equal(props.to, channelURL(channel.name))
    assert.isTrue(
      wrapper
        .find(".extra-navbar-items")
        .childAt(0)
        .text()
        .includes(children)
    )
  })

  it("shows the search button", () => {
    const wrapper = render()
    assert.ok(wrapper.find(".search-link").exists())
  })

  //
  ;[
    [false, undefined, false],
    [true, undefined, true],
    [false, [{ foo: "bar" }], true],
    [true, [{ foo: "bar" }], true]
  ].forEach(([userIsModerator, channelAbout, shouldShowAboutLink]) => {
    it(`${shouldIf(
      shouldShowAboutLink
    )} render about page link when user ${isIf(
      userIsModerator
    )} moderator and channelabout = ${JSON.stringify(channelAbout)}`, () => {
      channel.about = channelAbout
      channel.user_is_moderator = userIsModerator
      const wrapper = render()
      assert.equal(shouldShowAboutLink, wrapper.find(".about-link").exists())
    })
  })
})
