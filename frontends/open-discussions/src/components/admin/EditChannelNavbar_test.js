import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import IntegrationTestHelper from "../../util/integration_test_helper"
import EditChannelNavbar from "./EditChannelNavbar"
import {
  editChannelBasicURL,
  editChannelAppearanceURL,
  editChannelModeratorsURL,
  editChannelContributorsURL,
  channelModerationURL
} from "../../lib/url"

describe("EditChannelNavbar", () => {
  const channelName = "name"

  let helper

  beforeEach(() => {
    helper = new IntegrationTestHelper()
  })

  afterEach(() => {
    helper.cleanup()
  })

  it("shows the navbar", () => {
    const wrapper = shallow(<EditChannelNavbar channelName={channelName} />)
    const links = wrapper.find("NavLink")

    const linkPairs = [
      ["Basic", editChannelBasicURL(channelName)],
      ["Appearance", editChannelAppearanceURL(channelName)],
      ["Members", editChannelModeratorsURL(channelName)],
      ["Reported Content", channelModerationURL(channelName)]
    ]

    assert.equal(links.length, linkPairs.length)
    linkPairs.forEach(([text, url], i) => {
      const link = links.at(i)
      assert.equal(link.props().to, url)
      assert.equal(link.children().text(), text)
    })
  })
  ;[
    ["moderators", editChannelModeratorsURL(channelName), true],
    ["contributors", editChannelContributorsURL(channelName), true],
    ["basic", editChannelBasicURL(channelName), false],
    ["appearance", editChannelAppearanceURL(channelName), false]
  ].forEach(([description, url, isHighlighted]) => {
    it(`${
      isHighlighted ? "highlights" : "doesn't highlight"
    } the members link for the ${description} url`, () => {
      const wrapper = shallow(<EditChannelNavbar channelName={channelName} />)
      const link = wrapper.find("NavLink").at(2)
      assert.equal(link.children().text(), "Members")
      assert.equal(
        link.props().isActive(null, {
          pathname: url
        }),
        isHighlighted
      )
    })
  })
})
