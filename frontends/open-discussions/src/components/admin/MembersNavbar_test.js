import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import MembersNavbar from "./MembersNavbar"

import { makeChannel } from "../../factories/channels"
import {
  editChannelContributorsURL,
  editChannelModeratorsURL
} from "../../lib/url"
import {
  CHANNEL_TYPE_PUBLIC,
  CHANNEL_TYPE_RESTRICTED,
  CHANNEL_TYPE_PRIVATE
} from "../../lib/channels"

describe("MembersNavbar", () => {
  let channel
  beforeEach(() => {
    channel = makeChannel()
  })
  ;[
    [CHANNEL_TYPE_PUBLIC, false],
    [CHANNEL_TYPE_PRIVATE, true],
    [CHANNEL_TYPE_RESTRICTED, true]
  ].forEach(([channelType, showContributor]) => {
    it(`shows the navbar for channel type ${channelType}`, () => {
      channel.channel_type = channelType
      const wrapper = shallow(<MembersNavbar channel={channel} />)
      const links = wrapper.find("NavLink")

      const linkPairs = [
        ["Moderators", editChannelModeratorsURL(channel.name)],
        ...(showContributor
          ? [["Contributors", editChannelContributorsURL(channel.name)]]
          : [])
      ]

      assert.equal(links.length, linkPairs.length)
      linkPairs.forEach(([text, url], i) => {
        const link = links.at(i)
        assert.equal(link.props().to, url)
        assert.equal(link.children().text(), text)
      })
    })
  })
})
