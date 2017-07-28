// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import { newPostURL } from '../lib/url'
import { makeChannel } from "../factories/channels"
import ChannelSidebar from "./ChannelSidebar"

describe("ChannelSidebar", () => {
  const renderSidebar = channel => shallow(<ChannelSidebar channel={channel} />)

  it("should render channel info correctly", () => {
    const channel = makeChannel()
    const wrapper = renderSidebar(channel)
    assert.equal(wrapper.find(".title").text(), channel.title)
    assert.equal(wrapper.find(".description").text(), channel.public_description)
    assert.equal(wrapper.find(".num-users").text(), `${channel.num_users} users`)
    assert.equal(wrapper.find("Link").props().to, newPostURL(channel.name))
  })
})
