// @flow
import { assert } from "chai"

import MarkdownWidget from "../components/widgets/MarkdownWidget"

import {
  validWidgetRenderers,
  getWidgetKey,
  newWidgetInstance
} from "./widgets"
import { makeWidgetInstance } from "../factories/widgets"

describe("widget library functions", () => {
  describe("valid widget renderers", () => {
    it("renders with MarkdownWidget", () => {
      assert.equal(validWidgetRenderers.markdown, MarkdownWidget)
    })
  })

  describe("getWidgetKey", () => {
    it("renders a key for an existing widget", () => {
      const instance = makeWidgetInstance()
      const key = getWidgetKey(instance)
      assert.equal(key, String(instance.id))
    })

    it("renders a key for a new widget", () => {
      const key = getWidgetKey(newWidgetInstance())
      assert.isTrue(key.startsWith("new-"))
    })
  })
})
