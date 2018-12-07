// @flow
import { assert } from "chai"

import MarkdownWidget from "./MarkdownWidget"

import { configureShallowRenderer } from "../../lib/test_utils"

describe("MarkdownWidget", () => {
  const title = "this is title"
  const source = "this is markdown"
  let renderWidget

  beforeEach(() => {
    renderWidget = configureShallowRenderer(MarkdownWidget, { title, source })
  })

  it("should display the title and markdown", () => {
    const wrapper = renderWidget()
    assert.equal(wrapper.find(".widget-title").text(), title)
    assert.ok(wrapper.find("Markdown").exists())
    assert.ok(wrapper.find("Markdown").props().source, source)
  })
})
