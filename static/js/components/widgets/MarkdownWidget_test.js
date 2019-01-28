// @flow
import { assert } from "chai"

import MarkdownWidget from "./MarkdownWidget"

import { configureShallowRenderer } from "../../lib/test_utils"
import { makeWidgetInstance } from "../../factories/widgets"

describe("MarkdownWidget", () => {
  let renderWidget, instance

  beforeEach(() => {
    instance = makeWidgetInstance("Markdown")
    renderWidget = configureShallowRenderer(MarkdownWidget, {
      widgetInstance: instance
    })
  })

  it("should display the title and markdown", () => {
    const wrapper = renderWidget()
    assert.ok(wrapper.find("Markdown").exists())
    assert.equal(
      wrapper.find("Markdown").prop("source"),
      instance.configuration.source
    )
  })
})
