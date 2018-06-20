import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import EditChannelNavbar from "./EditChannelNavbar"
import { editChannelBasicURL, editChannelAppearanceURL } from "../../lib/url"

describe("EditChannelNavbar", () => {
  it("shows the navbar", () => {
    const channelName = "name"
    const wrapper = shallow(<EditChannelNavbar channelName={channelName} />)
    const links = wrapper.find("NavLink")
    assert.equal(links.at(0).props().to, editChannelBasicURL(channelName))
    assert.equal(
      links
        .at(0)
        .children()
        .text(),
      "Basic"
    )
    assert.equal(links.at(1).props().to, editChannelAppearanceURL(channelName))
    assert.equal(
      links
        .at(1)
        .children()
        .text(),
      "Appearance"
    )
  })
})
