// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import SubscriptionsList from "./SubscriptionsList"

import { channelURL } from "../lib/url"
import { makeChannelList } from "../factories/channels"

describe("SubscriptionsList", function() {
  let channels
  const renderSubscriptionsList = (props = { subscribedChannels: channels }) =>
    shallow(<SubscriptionsList {...props} />)

  beforeEach(() => {
    channels = makeChannelList()
  })

  it("should show each channel", () => {
    let wrapper = renderSubscriptionsList()
    assert.equal(wrapper.find(Link).length, channels.length)
    wrapper.find(Link).forEach((link, index) => {
      assert.equal(link.props().to, channelURL(channels[index].name))
      assert.equal(link.props().children, channels[index].title)
    })
  })
})
