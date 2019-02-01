// @flow
import { assert } from "chai"

import MarkdownWidget from "../components/widgets/MarkdownWidget"
import RssWidget from "../components/widgets/RssWidget"
import UrlWidget from "../components/widgets/UrlWidget"

import {
  WIDGET_TYPE_URL,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_MARKDOWN
} from "./constants"
import {
  validWidgetRenderers,
  getWidgetKey,
  newWidgetInstance
} from "./widgets"
import { makeWidgetInstance } from "../factories/widgets"

describe("widget library functions", () => {
  describe("valid widget renderers", () => {
    it("renders with MarkdownWidget", () => {
      assert.equal(validWidgetRenderers[WIDGET_TYPE_MARKDOWN], MarkdownWidget)
    })

    it("renders with RssWidget", () => {
      assert.equal(validWidgetRenderers[WIDGET_TYPE_RSS], RssWidget)
    })

    it("renders with UrlWidget", () => {
      assert.equal(validWidgetRenderers[WIDGET_TYPE_URL], UrlWidget)
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
