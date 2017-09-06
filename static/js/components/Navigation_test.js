// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import Navigation from "./Navigation"
import SubscriptionsList from "./SubscriptionsList"

import { newPostURL } from "../lib/url"
import { makeChannelList } from "../factories/channels"

describe("Navigation", () => {
  describe("component", () => {
    const defaultProps = { pathname: "/", subscribedChannels: [] }
    const renderComponent = (props = defaultProps) =>
      shallow(<Navigation {...props} />)

    it("should not show a create post link if channelName is not in URL", () => {
      let wrapper = renderComponent()
      assert.lengthOf(wrapper.find(Link), 0)
    })

    it("should show create post link if channelName is in URL", () => {
      let wrapper = renderComponent({
        ...defaultProps,
        channelName: "foobar"
      })
      let link = wrapper.find(Link)
      assert.equal(link.props().to, newPostURL("foobar"))
      assert.equal(link.props().children, "Submit a New Post")
    })

    it("should show a SubscriptionsList", () => {
      let channels = makeChannelList(10)
      let wrapper = renderComponent({
        ...defaultProps,
        subscribedChannels: channels
      })
      assert.equal(
        wrapper.find(SubscriptionsList).props().subscribedChannels,
        channels
      )
    })
  })
})
