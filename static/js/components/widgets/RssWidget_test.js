// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import RssWidget from "./RssWidget"
import { makeWidgetInstance } from "../../factories/widgets"

describe("RssWidget", () => {
  it("renders a RssWidget", () => {
    const widgetInstance = makeWidgetInstance("RSS Feed")
    const wrapper = shallow(<RssWidget widgetInstance={widgetInstance} />)
    assert.equal(widgetInstance.title, wrapper.find(".title").text())
    assert.equal(
      widgetInstance.json.entries.length,
      wrapper.find(".entry").length
    )

    widgetInstance.json.entries.forEach((entry, i) => {
      const entryWrapper = wrapper.find(".entry").at(i)
      assert.equal(entryWrapper.find(".time").text(), entry.timestamp.fromNow())
      assert.equal(entryWrapper.find(".entry-title a").prop("href"), entry.link)
      assert.equal(entryWrapper.find(".entry-title").text(), entry.title)
      assert.equal(
        entryWrapper
          .find(".description")
          .childAt(0)
          .text(),
        entry.description
      )
    })
  })

  it("renders a RssWidget with a missing timestamp", () => {
    const widgetInstance = makeWidgetInstance("RSS Feed")
    widgetInstance.json.entries[0].timestamp = null
    const wrapper = shallow(<RssWidget widgetInstance={widgetInstance} />)
    const entryWrapper = wrapper.find(".entry").at(0)
    assert.equal(entryWrapper.find(".time").text(), "")
  })
})
