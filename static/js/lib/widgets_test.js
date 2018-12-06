// @flow
import { assert } from "chai"

import MarkdownWidget from "../components/widgets/MarkdownWidget"

import { validWidgetRenderers } from "./widgets"

describe("widget library functions", () => {
  describe("valid widget renderers", () => {
    it("renders with MarkdownWidget", () => {
      assert.equal(validWidgetRenderers.markdown, MarkdownWidget)
    })
  })
})
