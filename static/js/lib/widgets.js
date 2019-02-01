// @flow
import MarkdownWidget from "../components/widgets/MarkdownWidget"
import RssWidget from "../components/widgets/RssWidget"
import UrlWidget from "../components/widgets/UrlWidget"

import {
  WIDGET_TYPE_MARKDOWN,
  WIDGET_TYPE_RSS,
  WIDGET_TYPE_URL
} from "./constants"
import { incrementer } from "./util"

import type { WidgetInstancePatchable } from "../flow/widgetTypes"

export const WIDGET_FORM_KEY = "widgets:edit"

export const validWidgetRenderers = {
  [WIDGET_TYPE_MARKDOWN]: MarkdownWidget,
  [WIDGET_TYPE_RSS]:      RssWidget,
  [WIDGET_TYPE_URL]:      UrlWidget
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
