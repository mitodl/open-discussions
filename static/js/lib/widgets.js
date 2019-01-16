// @flow
import MarkdownWidget from "../components/widgets/MarkdownWidget"
import RssWidget from "../components/widgets/RssWidget"
import UrlWidget from "../components/widgets/UrlWidget"

import { incrementer } from "./util"

import type { WidgetInstancePatchable } from "../flow/widgetTypes"

export const WIDGET_FORM_KEY = "widgets:edit"

export const validWidgetRenderers = {
  Markdown:   MarkdownWidget,
  "RSS Feed": RssWidget,
  URL:        UrlWidget
}

const newWidgetIncr = incrementer()

export const newWidgetInstance = (): WidgetInstancePatchable => ({
  configuration: {},
  title:         "",
  widget_type:   "",
  newId:         `new-${String(newWidgetIncr.next().value)}`
})

export const getWidgetKey = (widgetInstance: WidgetInstancePatchable): string =>
  String(widgetInstance.id || widgetInstance.newId)
