import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import MembersNavbar from "./MembersNavbar"
import {
  editChannelContributorsURL,
  editChannelModeratorsURL
} from "../../lib/url"

describe("MembersNavbar", () => {
  it("shows the navbar", () => {
    const channelName = "name"
    const wrapper = shallow(<MembersNavbar channelName={channelName} />)
    const links = wrapper.find("NavLink")

    const linkPairs = [
      ["Moderators", editChannelModeratorsURL(channelName)],
      ["Contributors", editChannelContributorsURL(channelName)]
    ]

    assert.equal(links.length, linkPairs.length)
    linkPairs.forEach(([text, url], i) => {
      const link = links.at(i)
      assert.equal(link.props().to, url)
      assert.equal(link.children().text(), text)
    })
  })
})
