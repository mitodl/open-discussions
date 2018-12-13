// @flow
import React from "react"
import { shallow } from "enzyme"
import { assert } from "chai"

import WidgetInstance from "./WidgetInstance"
import { makeWidgetInstance } from "../../factories/widgets"

describe("WidgetInstance", () => {
  [["missing", "DefaultWidget"], ["markdown", "MarkdownWidget"]].forEach(
    ([rendererName, widgetClassName]) => {
      it(`renders a widget instance for ${widgetClassName} given name react_renderer=${rendererName}`, () => {
        const instance = makeWidgetInstance(rendererName)
        const wrapper = shallow(<WidgetInstance widgetInstance={instance} />)
        assert.isTrue(wrapper.find(widgetClassName).exists())
        assert.equal(
          wrapper.find(widgetClassName).prop("widgetInstance"),
          instance
        )
      })
    }
  )
})
