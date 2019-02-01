// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import UrlWidget from "./UrlWidget"

import { WIDGET_TYPE_URL } from "../../lib/constants"
import { makeWidgetInstance } from "../../factories/widgets"

describe("UrlWidget", () => {
  it("renders a UrlWidget", () => {
    const widgetInstance = makeWidgetInstance(WIDGET_TYPE_URL)
    const wrapper = shallow(<UrlWidget widgetInstance={widgetInstance} />)
    assert.equal(
      wrapper.find("EmbedlyCard").prop("url"),
      widgetInstance.configuration.url
    )
  })
})
