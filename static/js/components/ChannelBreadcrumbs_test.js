// @flow
import React from "react"
import { assert } from "chai"
import { shallow } from "enzyme"
import { Link } from "react-router-dom"

import ChannelBreadcrumbs from "./ChannelBreadcrumbs"

import { makeChannel } from "../factories/channels"

describe("ChannelBreadcrumbs", () => {
  const renderBreadcrumbs = channel =>
    shallow(<ChannelBreadcrumbs channel={channel} />)

  it("should render breadcrumbs", () => {
    const channel = makeChannel()
    const wrapper = renderBreadcrumbs(channel)
    const [first, second] = wrapper.find(Link)
    assert.equal(first.props.to, "/")
    assert.equal(first.props.children, "Home")
    assert.equal(second.props.to, `/channel/${channel.name}`)
    assert.equal(second.props.children, channel.title)
  })
})
