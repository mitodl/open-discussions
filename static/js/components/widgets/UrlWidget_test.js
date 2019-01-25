// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import UrlWidget from "./UrlWidget"
import { makeWidgetInstance } from "../../factories/widgets"

describe("UrlWidget", () => {
  it("renders a UrlWidget", () => {
    const widgetInstance = makeWidgetInstance("URL")
    const wrapper = shallow(<UrlWidget widgetInstance={widgetInstance} />)
    assert.equal(
      wrapper.find("Connect(EmbedlyContainer)").prop("url"),
      widgetInstance.configuration.url
    )
  })
})
