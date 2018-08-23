// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"

import SubscriptionsList from "./SubscriptionsList"

import { channelURL, editChannelBasicURL } from "../lib/url"
import { makeChannelList } from "../factories/channels"

describe("SubscriptionsList", function() {
  let channels, myChannels, notMyChannels
  const renderSubscriptionsList = (
    props = { subscribedChannels: channels, currentChannel: channels[0].name }
  ) => shallow(<SubscriptionsList {...props} />)

  beforeEach(() => {
    channels = makeChannelList()
    // make sure there are some of each and they're not grouped together
    channels.forEach((channel, i) => {
      channel.user_is_moderator = i % 2 === 0
    })

    myChannels = channels.filter(channel => channel.user_is_moderator)
    notMyChannels = channels.filter(channel => !channel.user_is_moderator)
  })

  it("should show each channel", () => {
    const wrapper = renderSubscriptionsList()

    assert.equal(wrapper.find(".channel-link").length, channels.length)
    assert.equal(
      wrapper.find(".my-channels .channel-link").length,
      myChannels.length
    )
    assert.equal(
      wrapper.find(".channels .channel-link").length,
      notMyChannels.length
    )

    wrapper.find(".my-channels .channel-link").forEach((link, index) => {
      assert.equal(link.find(".title").text(), myChannels[index].title)
      assert.equal(link.props().to, channelURL(myChannels[index].name))
      assert.deepEqual(
        link.find("Connect(ChannelAvatar)").props().channel,
        myChannels[index]
      )
    })

    wrapper.find(".channels .channel-link").forEach((link, index) => {
      assert.equal(link.find(".title").text(), notMyChannels[index].title)
      assert.equal(link.props().to, channelURL(notMyChannels[index].name))
      assert.deepEqual(
        link.find("Connect(ChannelAvatar)").props().channel,
        notMyChannels[index]
      )
    })
  })

  it("should show settings links for channels you are moderator of", () => {
    const wrapper = renderSubscriptionsList()

    assert.equal(
      wrapper.find(".my-channels .settings-link").length,
      myChannels.length
    )
    wrapper.find(".my-channels .settings-link").forEach((link, index) => {
      assert.equal(link.props().to, editChannelBasicURL(myChannels[index].name))
    })

    assert.equal(wrapper.find(".channels .settings-link").length, 0)
  })

  it("should highlight the current channel", () => {
    const wrapper = renderSubscriptionsList()
    const currentLocation = wrapper.find(".current-location")
    assert.lengthOf(currentLocation, 1)
    assert.equal(currentLocation.props().className, "location current-location")
    assert.equal(currentLocation.find(".title").text(), channels[0].title)
    assert.equal(
      currentLocation
        .find(".channel-link")
        .at(0)
        .props().to,
      channelURL(channels[0].name)
    )
  })
})
