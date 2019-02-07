// @flow
import { assert } from "chai"

import ChannelSidebar from "./ChannelSidebar"

import { makeChannel } from "../factories/channels"
import { configureShallowRenderer } from "../lib/test_utils"

describe("ChannelSidebar", () => {
  let channel, renderSidebar

  beforeEach(() => {
    channel = makeChannel()
    renderSidebar = configureShallowRenderer(ChannelSidebar, { channel })
  })

  it("should render sidebar with widgets", () => {
    const wrapper = renderSidebar()
    assert.ok(wrapper.find("ChannelWidgetList").exists())
    assert.equal(wrapper.find("ChannelWidgetList").props().channel, channel)
  })
})
