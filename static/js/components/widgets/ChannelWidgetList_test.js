// @flow
import { assert } from "chai"

import ChannelWidgetList from "./ChannelWidgetList"

import { configureShallowRenderer } from "../../lib/test_utils"
import { makeChannel } from "../../factories/channels"

describe("ChannelWidgetList", () => {
  let channel, renderWidgetList

  beforeEach(() => {
    channel = makeChannel()
    renderWidgetList = configureShallowRenderer(ChannelWidgetList, { channel })
  })

  it("should render the list if widget_list_id is set", () => {
    channel.widget_list_id = 1
    const wrapper = renderWidgetList()
    assert.ok(wrapper.find("Connect(WidgetList)").exists())
    const props = wrapper.find("Connect(WidgetList)").props()
    assert.equal(props.widgetListId, 1)
  })

  it("should not render the list if widget_list_id is null", () => {
    const wrapper = renderWidgetList()
    assert.isFalse(wrapper.find("Connect(WidgetList)").exists())
  })
})
